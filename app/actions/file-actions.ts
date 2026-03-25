"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import {
  resolveStrategyUploadMime,
  sanitizeStrategyFileName,
  STRATEGY_UPLOAD_MAX_BYTES,
} from "@/lib/strategy-upload-mime";
import { randomUUID } from "crypto";

const BUCKET = "strategy-assets";
const MAX_BYTES = STRATEGY_UPLOAD_MAX_BYTES;

async function assertStrategyOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
 * Upload files from FormData (`files` keys) using an existing authed client.
 * Caller must ensure `strategyId` belongs to the current user.
 */
export async function persistStrategyFilesFromFormData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  strategyId: string,
  formData: FormData
): Promise<{ uploaded: number; errors: string[] }> {
  const entries = formData.getAll("files");
  const errors: string[] = [];
  let uploaded = 0;

  for (const entry of entries) {
    if (!(entry instanceof Blob) || entry.size === 0) continue;
    const displayName =
      entry instanceof File && entry.name ? entry.name : `file-${uploaded + 1}`;
    try {
      if (entry.size > MAX_BYTES) {
        throw new Error("File too large (max 50MB)");
      }
      const mime = resolveStrategyUploadMime(entry, displayName);
      if (!mime) {
        throw new Error(`${displayName}: type not allowed`);
      }
      const safeName = sanitizeStrategyFileName(displayName);
      const objectPath = `${strategyId}/${randomUUID()}-${safeName}`;
      const buffer = Buffer.from(await entry.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, buffer, { contentType: mime, upsert: false });
      if (upErr) {
        throw new Error(
          `Storage: ${clarifySupabaseTableError(upErr.message)}`
        );
      }

      const ext = safeName.includes(".")
        ? safeName.split(".").pop() ?? null
        : null;
      const { error: dbErr } = await supabase.from("strategy_files").insert({
        strategy_id: strategyId,
        file_name: displayName,
        file_path: objectPath,
        file_type: ext,
        mime_type: mime,
        size_bytes: entry.size,
      });
      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([objectPath]);
        throw new Error(
          `Database (file row): ${clarifySupabaseTableError(dbErr.message)}`
        );
      }
      uploaded += 1;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Upload failed");
    }
  }

  if (uploaded > 0) {
    revalidatePath(`/strategies/${strategyId}`);
    revalidatePath("/dashboard");
  }

  return { uploaded, errors };
}

export async function uploadStrategyFile(strategyId: string, formData: FormData) {
  const supabase = await createClient();
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
  const mime = resolveStrategyUploadMime(raw, displayName);
  if (!mime) {
    throw new Error(
      "File type not allowed (archives, Office, PDF, images, text/code, JSON, etc.)."
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

  const { error: dbErr } = await supabase.from("strategy_files").insert({
    strategy_id: strategyId,
    file_name: displayName,
    file_path: objectPath,
    file_type: ext,
    mime_type: mime,
    size_bytes: raw.size,
  });

  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw new Error(
      `Database (file row): ${clarifySupabaseTableError(dbErr.message)}`
    );
  }

  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath("/dashboard");
}

/** Upload many files in one server action (same session). */
export async function uploadStrategyFiles(
  strategyId: string,
  formData: FormData
): Promise<{ uploaded: number; errors: string[] }> {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);
  return persistStrategyFilesFromFormData(supabase, strategyId, formData);
}

export async function deleteStrategyFile(strategyId: string, fileId: string) {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const { data: row } = await supabase
    .from("strategy_files")
    .select("file_path")
    .eq("id", fileId)
    .eq("strategy_id", strategyId)
    .maybeSingle();

  if (!row) throw new Error("File not found");

  await supabase.storage.from(BUCKET).remove([row.file_path]);
  const { error } = await supabase.from("strategy_files").delete().eq("id", fileId);
  if (error) throw new Error(clarifySupabaseTableError(error.message));

  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath("/dashboard");
}
