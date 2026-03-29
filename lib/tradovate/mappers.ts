import {
  externalAccountKey,
  pickNumericId,
} from "@/lib/tradovate/client";
import { extractFillPnlAndTime } from "@/lib/tradovate/stats";
import type { TradovateEnvironment } from "@/lib/tradovate/types";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function mapTradingAccountUpsert(args: {
  userId: string;
  connectionId: string;
  environment: TradovateEnvironment;
  raw: Record<string, unknown>;
}): {
  user_id: string;
  connection_id: string;
  external_account_id: string;
  external_account_name: string | null;
  environment: string;
  status: string | null;
  balance: number | null;
  net_pnl: number | null;
  unrealized_pnl: number | null;
  available_margin: number | null;
  raw_json: Record<string, unknown>;
} {
  const ext = externalAccountKey(args.raw);
  const nameRaw =
    args.raw.name ??
    args.raw.nickname ??
    args.raw.accountName ??
    args.raw.label;
  const name = typeof nameRaw === "string" ? nameRaw : null;
  const statusRaw = args.raw.status ?? args.raw.accountStatus;
  const status = typeof statusRaw === "string" ? statusRaw : null;

  return {
    user_id: args.userId,
    connection_id: args.connectionId,
    external_account_id: ext,
    external_account_name: name,
    environment: args.environment,
    status,
    balance: num(
      args.raw.netLiq ??
        args.raw.netLiquidation ??
        args.raw.balance ??
        args.raw.cashBalance
    ),
    net_pnl: num(args.raw.totalPnL ?? args.raw.totalPnl ?? args.raw.netPnl),
    unrealized_pnl: num(args.raw.unrealizedPnL ?? args.raw.openPnL),
    available_margin: num(
      args.raw.availableFunds ?? args.raw.availableMargin ?? args.raw.marginAvailable
    ),
    raw_json: args.raw,
  };
}

export function mapFillUpsert(args: {
  userId: string;
  tradingAccountId: string;
  raw: Record<string, unknown>;
}): {
  user_id: string;
  trading_account_id: string;
  external_fill_id: string;
  symbol: string | null;
  side: string | null;
  qty: number | null;
  price: number | null;
  commission: number | null;
  realized_pnl: number | null;
  fill_timestamp: string | null;
  raw_json: Record<string, unknown>;
} | null {
  const idRaw = args.raw.id ?? args.raw.fillId ?? args.raw.executionId;
  if (idRaw == null) return null;
  const external_fill_id = String(idRaw);
  const sym =
    args.raw.symbol ??
    args.raw.symbolName ??
    args.raw.contractName ??
    args.raw.productSymbol;
  const sideRaw = args.raw.side ?? args.raw.orderAction;
  const { pnl, timeMs } = extractFillPnlAndTime(args.raw);
  const ts =
    timeMs > 0
      ? new Date(timeMs).toISOString()
      : typeof args.raw.timestamp === "string"
        ? args.raw.timestamp
        : null;

  return {
    user_id: args.userId,
    trading_account_id: args.tradingAccountId,
    external_fill_id,
    symbol: typeof sym === "string" ? sym : null,
    side: typeof sideRaw === "string" ? sideRaw : null,
    qty: num(args.raw.qty ?? args.raw.quantity ?? args.raw.size),
    price: num(args.raw.price ?? args.raw.avgPrice),
    commission: num(args.raw.commission),
    realized_pnl: pnl,
    fill_timestamp: ts,
    raw_json: args.raw,
  };
}

export function mapPositionSnapshot(args: {
  userId: string;
  tradingAccountId: string;
  raw: Record<string, unknown>;
  snapshotAt: string;
}): {
  user_id: string;
  trading_account_id: string;
  symbol: string | null;
  side: string | null;
  qty: number | null;
  avg_price: number | null;
  unrealized_pnl: number | null;
  snapshot_at: string;
  raw_json: Record<string, unknown>;
} {
  const sym =
    args.raw.symbol ??
    args.raw.symbolName ??
    args.raw.contractName ??
    args.raw.productSymbol;
  const sideRaw =
    args.raw.side ??
    (typeof args.raw.netPos === "number"
      ? args.raw.netPos > 0
        ? "Long"
        : args.raw.netPos < 0
          ? "Short"
          : null
      : null);

  return {
    user_id: args.userId,
    trading_account_id: args.tradingAccountId,
    symbol: typeof sym === "string" ? sym : null,
    side: typeof sideRaw === "string" ? sideRaw : null,
    qty: num(args.raw.netPos ?? args.raw.qty ?? args.raw.quantity),
    avg_price: num(args.raw.avgPrice ?? args.raw.averagePrice),
    unrealized_pnl: num(args.raw.unrealizedPnL ?? args.raw.openPnL),
    snapshot_at: args.snapshotAt,
    raw_json: args.raw,
  };
}

export function accountNumericId(raw: Record<string, unknown>): number | null {
  return pickNumericId(raw);
}
