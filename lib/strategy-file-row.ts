import type { StrategyFileRow } from "@/lib/types";

/** Ensures a plain, JSON-serializable row (server actions + Supabase may return bigint). */
export function normalizeStrategyFileRow(raw: unknown): StrategyFileRow {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid strategy file row");
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) throw new Error("Strategy file row missing id");

  let createdAt: string;
  if (typeof o.created_at === "string") {
    createdAt = o.created_at;
  } else if (o.created_at instanceof Date) {
    createdAt = o.created_at.toISOString();
  } else {
    createdAt = new Date().toISOString();
  }

  const sizeRaw = o.size_bytes;
  let sizeBytes: number | null = null;
  if (sizeRaw != null && sizeRaw !== "") {
    const n = typeof sizeRaw === "bigint" ? Number(sizeRaw) : Number(sizeRaw);
    sizeBytes = Number.isFinite(n) ? n : null;
  }

  return {
    id,
    strategy_id: o.strategy_id != null ? String(o.strategy_id) : "",
    file_name: o.file_name != null ? String(o.file_name) : "file",
    file_path: o.file_path != null ? String(o.file_path) : "",
    file_type: o.file_type != null ? String(o.file_type) : null,
    mime_type: o.mime_type != null ? String(o.mime_type) : null,
    size_bytes: sizeBytes,
    created_at: createdAt,
  };
}
