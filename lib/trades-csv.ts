/** Parse CSV rows for `public.trades` (pnl + optional timestamp). */

const PNL_TOKENS = [
  "pnl",
  "profit",
  "pl",
  "p&l",
  "net_profit",
  "netprofit",
  "result",
  "gain",
  "realized",
];

const DATE_TOKENS = [
  "date",
  "time",
  "exit",
  "exit_time",
  "exittime",
  "closed",
  "created_at",
  "closetime",
  "close_time",
  "entry",
  "entry_time",
];

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && (c === "," || c === ";")) {
      result.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseMoneyCell(raw: string): number | null {
  if (!raw) return null;
  let t = raw.trim();
  if (/^\(.+\)$/.test(t)) {
    t = `-${t.slice(1, -1)}`;
  }
  t = t.replace(/[$€£\s]/g, "");
  if (t === "" || t === "-") return null;
  if (/^-?\d+,\d{2}$/.test(t)) {
    t = t.replace(",", ".");
  } else {
    t = t.replace(/,/g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseDateCell(raw: string): Date | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const iso = Date.parse(t);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    let mo = Number(m[1]);
    let d = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    if (mo > 12) {
      const swap = mo;
      mo = d;
      d = swap;
    }
    const hh = m[4] != null ? Number(m[4]) : 12;
    const mm = m[5] != null ? Number(m[5]) : 0;
    const ss = m[6] != null ? Number(m[6]) : 0;
    const dt = new Date(y, mo - 1, d, hh, mm, ss);
    return Number.isNaN(+dt) ? null : dt;
  }
  return null;
}

function headerMatchesPnl(h: string): boolean {
  if (!h) return false;
  return PNL_TOKENS.some((k) => h === k || h.endsWith(`_${k}`) || h.includes(k));
}

function headerMatchesDate(h: string): boolean {
  if (!h) return false;
  return DATE_TOKENS.some((k) => h === k || h.includes(k));
}

export type ParsedTradeRow = { pnl: number; created_at: string };

export function parseTradesCsv(
  text: string
): { ok: true; rows: ParsedTradeRow[] } | { ok: false; error: string } {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { ok: false, error: "File is empty" };

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, error: "File is empty" };

  const firstCells = parseCsvLine(lines[0]);
  const secondCells = lines[1] ? parseCsvLine(lines[1]) : null;
  const firstAsPnl = parseMoneyCell(firstCells[0] ?? "");
  const secondAsPnl =
    secondCells && secondCells.length ? parseMoneyCell(secondCells[0] ?? "") : null;
  const hasHeader =
    firstAsPnl === null && secondAsPnl !== null && secondCells!.length > 0;

  let start = 0;
  let pnlIdx = 0;
  let dateIdx: number | null = null;

  if (hasHeader) {
    const headers = firstCells.map((c) => normalizeHeader(c));
    pnlIdx = headers.findIndex((h) => headerMatchesPnl(h));
    if (pnlIdx < 0) {
      return {
        ok: false,
        error:
          'No P&L column found. Use a header such as "pnl", "profit", or "result".',
      };
    }
    const di = headers.findIndex((h) => headerMatchesDate(h));
    dateIdx = di >= 0 ? di : null;
    start = 1;
  } else {
    pnlIdx = 0;
    if (firstCells.length >= 2) {
      const di = 1;
      const maybeDate = parseDateCell(firstCells[di] ?? "");
      dateIdx = maybeDate ? di : null;
    }
  }

  const rows: ParsedTradeRow[] = [];
  const baseMs = Date.now();

  for (let i = start; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (!cells.length) continue;
    const pnl = parseMoneyCell(cells[pnlIdx] ?? "");
    if (pnl === null) continue;

    let createdAt: string;
    if (dateIdx !== null && cells[dateIdx] != null && cells[dateIdx] !== "") {
      const d = parseDateCell(cells[dateIdx]!);
      createdAt = d
        ? d.toISOString()
        : new Date(baseMs + rows.length * 60_000).toISOString();
    } else {
      createdAt = new Date(baseMs + rows.length * 60_000).toISOString();
    }
    rows.push({ pnl, created_at: createdAt });
  }

  if (!rows.length) {
    return {
      ok: false,
      error: "No valid trade rows found (check the profit column format).",
    };
  }

  return { ok: true, rows };
}
