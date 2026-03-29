function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function parseTimeMs(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  if (typeof raw === "string") {
    const d = Date.parse(raw);
    if (!Number.isNaN(d)) return d;
  }
  return 0;
}

export function extractFillPnlAndTime(raw: Record<string, unknown>): {
  pnl: number;
  timeMs: number;
} {
  const pnl =
    raw.realizedPnl ??
    raw.netPnl ??
    raw.pnl ??
    raw.profitLoss ??
    raw.pl ??
    0;
  const timeMs = parseTimeMs(
    raw.timestamp ?? raw.time ?? raw.fillTime ?? raw.creationTimestamp
  );
  return { pnl: num(pnl), timeMs };
}

export type DerivedPack = {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  gross_profit: number;
  gross_loss: number;
  net_profit: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  average_trade: number;
  max_drawdown: number;
  equity_curve: { t: string; v: number }[];
  daily_pnl_curve: { day: string; v: number }[];
};

export function computeDerivedFromFills(
  fills: { pnl: number; timeMs: number }[]
): DerivedPack {
  const sorted = [...fills].filter((f) => f.timeMs > 0).sort((a, b) => a.timeMs - b.timeMs);

  let winning = 0;
  let losing = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;

  for (const f of fills) {
    const p = f.pnl;
    if (p > 0) {
      winning += 1;
      grossProfit += p;
      largestWin = Math.max(largestWin, p);
    } else if (p < 0) {
      losing += 1;
      grossLoss += p;
      largestLoss = Math.min(largestLoss, p);
    }
  }

  const totalTrades = fills.length;
  const netProfit = grossProfit + grossLoss;
  const winRate = totalTrades > 0 ? (winning / totalTrades) * 100 : 0;
  const avgWin = winning > 0 ? grossProfit / winning : 0;
  const avgLoss = losing > 0 ? grossLoss / losing : 0;
  const averageTrade = totalTrades > 0 ? netProfit / totalTrades : 0;

  let peak = 0;
  let maxDd = 0;
  let cum = 0;
  const equityCurve: { t: string; v: number }[] = [];
  for (const f of sorted) {
    cum += f.pnl;
    peak = Math.max(peak, cum);
    maxDd = Math.min(maxDd, cum - peak);
    equityCurve.push({ t: new Date(f.timeMs).toISOString(), v: cum });
  }

  const byDay = new Map<string, number>();
  for (const f of sorted) {
    const day = new Date(f.timeMs).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + f.pnl);
  }
  const daily_pnl_curve = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, v }));

  return {
    total_trades: totalTrades,
    winning_trades: winning,
    losing_trades: losing,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    net_profit: netProfit,
    win_rate: winRate,
    avg_win: avgWin,
    avg_loss: avgLoss,
    largest_win: largestWin,
    largest_loss: largestLoss,
    average_trade: averageTrade,
    max_drawdown: maxDd,
    equity_curve: equityCurve,
    daily_pnl_curve,
  };
}
