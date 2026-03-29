import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import {
  resolveStrategyUploadMimeAsync,
  sanitizeStrategyFileName,
  STRATEGY_UPLOAD_MAX_BYTES,
} from "@/lib/strategy-upload-mime";
import { normalizeStrategyFileRow } from "@/lib/strategy-file-row";
import type { StrategyFileRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const BUCKET = "strategy-assets";
const MAX_BYTES = STRATEGY_UPLOAD_MAX_BYTES;

export async function assertStrategyOwner(
  supabase: SupabaseClient,
  strategyId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: row } = await supabase
    .from("strategies")
    .select("id")
    .eq("id", strategyId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!row) throw new Error("Not found");
}

/**
 * Shared upload implementation (Server Action + Route Handler).
 */
export async function uploadStrategyFileFromFormData(
  supabase: SupabaseClient,
  strategyId: string,
  formData: FormData
): Promise<StrategyFileRow> {
  await assertStrategyOwner(supabase, strategyId);

  const raw = formData.get("file");
  if (!(raw instanceof Blob) || raw.size === 0) {
    throw new Error("No file");
  }
  if (raw.size > MAX_BYTES) {
    throw new Error("File too large (max 50MB)");
  }
  const displayName =
    raw instanceof File && raw.name ? raw.name : "upload";
  const mime = await resolveStrategyUploadMimeAsync(raw, displayName);
  if (!mime) {
    throw new Error(
      "Could not detect file type. Try renaming with an extension (.png, .pdf) or use a supported format."
    );
  }

  const safeName = sanitizeStrategyFileName(displayName);
  const objectPath = `${strategyId}/${randomUUID()}-${safeName}`;

  const buffer = Buffer.from(await raw.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType: mime, upsert: false });

  if (upErr) {
    throw new Error(`Storage: ${clarifySupabaseTableError(upErr.message)}`);
  }

  const ext = safeName.includes(".") ? safeName.split(".").pop() ?? null : null;

  const { data: inserted, error: dbErr } = await supabase
    .from("strategy_files")
    .insert({
      strategy_id: strategyId,
      file_name: displayName,
      file_path: objectPath,
      file_type: ext,
      mime_type: mime,
      size_bytes: raw.size,
    })
    .select("*")
    .single();

  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw new Error(
      `Database (file row): ${clarifySupabaseTableError(dbErr.message)}`
    );
  }

  return normalizeStrategyFileRow(inserted);
}
