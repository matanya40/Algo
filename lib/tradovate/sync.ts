import { decryptSecret } from "@/lib/crypto/aes-gcm";
import {
  getTradovateBaseUrl,
  tradovateAccessToken,
  tradovateAccountList,
  tradovateFillList,
  tradovatePositionList,
} from "@/lib/tradovate/client";
import {
  accountNumericId,
  mapFillUpsert,
  mapPositionSnapshot,
  mapTradingAccountUpsert,
} from "@/lib/tradovate/mappers";
import { computeDerivedFromFills, extractFillPnlAndTime } from "@/lib/tradovate/stats";
import type {
  BrokerConnectionRow,
  TradovateCredentials,
  TradovateEnvironment,
} from "@/lib/tradovate/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

export async function probeTradovate(
  env: TradovateEnvironment,
  creds: TradovateCredentials
): Promise<{ accountsFound: number }> {
  const baseUrl = getTradovateBaseUrl(env);
  const token = await tradovateAccessToken(baseUrl, creds);
  const accounts = await tradovateAccountList(baseUrl, token);
  return { accountsFound: accounts.length };
}

export async function testTradovateConnection(row: BrokerConnectionRow): Promise<{
  ok: true;
  accountsFound: number;
}> {
  const password = decryptSecret(row.password_encrypted);
  const sec = decryptSecret(row.sec_encrypted);
  const env = row.environment as TradovateEnvironment;
  const { accountsFound } = await probeTradovate(env, {
    username: row.username,
    password,
    appId: row.app_id,
    appVersion: row.app_version,
    cid: row.cid,
    sec,
  });
  return { ok: true, accountsFound };
}

export async function syncBrokerConnection(
  supabase: SupabaseClient,
  row: BrokerConnectionRow
): Promise<{ ok: true } | { ok: false; message: string }> {
  const env = row.environment as TradovateEnvironment;
  const now = new Date().toISOString();

  try {
    const password = decryptSecret(row.password_encrypted);
    const sec = decryptSecret(row.sec_encrypted);
    const baseUrl = getTradovateBaseUrl(env);
    const token = await tradovateAccessToken(baseUrl, {
      username: row.username,
      password,
      appId: row.app_id,
      appVersion: row.app_version,
      cid: row.cid,
      sec,
    });

    const accountsRaw = await tradovateAccountList(baseUrl, token);

    for (const item of accountsRaw) {
      const raw = item as Record<string, unknown>;
      const mapped = mapTradingAccountUpsert({
        userId: row.user_id,
        connectionId: row.id,
        environment: env,
        raw,
      });

      const { data: accRow, error: accErr } = await supabase
        .from("trading_accounts")
        .upsert(
          {
            ...mapped,
            last_synced_at: now,
          },
          { onConflict: "connection_id,external_account_id" }
        )
        .select("id")
        .single();

      if (accErr) {
        return { ok: false, message: accErr.message };
      }
      const tradingAccountId = accRow.id as string;

      const numId = accountNumericId(raw);
      let fills: unknown[] = [];
      if (numId != null) {
        try {
          fills = await tradovateFillList(baseUrl, token, numId);
        } catch {
          fills = [];
        }
      }

      const fillRows = fills
        .map((f) =>
          mapFillUpsert({
            userId: row.user_id,
            tradingAccountId,
            raw: f as Record<string, unknown>,
          })
        )
        .filter((x): x is NonNullable<typeof x> => x != null);

      if (fillRows.length > 0) {
        for (let i = 0; i < fillRows.length; i += 200) {
          const chunk = fillRows.slice(i, i + 200);
          const { error: fillErr } = await supabase.from("account_fills").upsert(chunk, {
            onConflict: "trading_account_id,external_fill_id",
          });
          if (fillErr) {
            return { ok: false, message: fillErr.message };
          }
        }
      }

      let positions: unknown[] = [];
      if (numId != null) {
        try {
          positions = await tradovatePositionList(baseUrl, token, numId);
        } catch {
          positions = [];
        }
      }

      const snapshotAt = now;
      const snapRows = positions.map((p) =>
        mapPositionSnapshot({
          userId: row.user_id,
          tradingAccountId,
          raw: p as Record<string, unknown>,
          snapshotAt,
        })
      );
      if (snapRows.length > 0) {
        const { error: snapErr } = await supabase
          .from("account_position_snapshots")
          .insert(snapRows);
        if (snapErr) {
          return { ok: false, message: snapErr.message };
        }
      }

      const unrealizedSum = positions.reduce((acc: number, p) => {
        const row = p as Record<string, unknown>;
        return acc + num(row.unrealizedPnL ?? row.openPnL);
      }, 0);

      const { error: updErr } = await supabase
        .from("trading_accounts")
        .update({
          open_positions_count: positions.length,
          total_fills_count: fills.length,
          unrealized_pnl: unrealizedSum || mapped.unrealized_pnl,
          last_synced_at: snapshotAt,
        })
        .eq("id", tradingAccountId);

      if (updErr) {
        return { ok: false, message: updErr.message };
      }

      const fillPoints = fills.map((f) => {
        const r = f as Record<string, unknown>;
        const { pnl, timeMs } = extractFillPnlAndTime(r);
        return { pnl, timeMs };
      });
      const d = computeDerivedFromFills(fillPoints);

      const { error: stErr } = await supabase.from("account_derived_stats").upsert(
        {
          user_id: row.user_id,
          trading_account_id: tradingAccountId,
          total_trades: d.total_trades,
          winning_trades: d.winning_trades,
          losing_trades: d.losing_trades,
          gross_profit: d.gross_profit,
          gross_loss: d.gross_loss,
          net_profit: d.net_profit,
          win_rate: d.win_rate,
          avg_win: d.avg_win,
          avg_loss: d.avg_loss,
          largest_win: d.largest_win,
          largest_loss: d.largest_loss,
          average_trade: d.average_trade,
          max_drawdown: d.max_drawdown,
          equity_curve: d.equity_curve,
          daily_pnl_curve: d.daily_pnl_curve,
          updated_at: now,
        },
        { onConflict: "trading_account_id" }
      );
      if (stErr) {
        return { ok: false, message: stErr.message };
      }
    }

    const { error: connErr } = await supabase
      .from("broker_connections")
      .update({
        last_sync_at: now,
        last_status: "connected",
        last_error: null,
      })
      .eq("id", row.id)
      .eq("user_id", row.user_id);

    if (connErr) {
      return { ok: false, message: connErr.message };
    }

    return { ok: true };
  } catch (e) {
    const message = friendlyError(e).slice(0, 2000);
    await supabase
      .from("broker_connections")
      .update({
        last_status: "failed",
        last_error: message,
      })
      .eq("id", row.id)
      .eq("user_id", row.user_id);
    return { ok: false, message };
  }
}
