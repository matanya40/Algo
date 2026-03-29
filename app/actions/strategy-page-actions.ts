"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import {
  resolveStrategyUploadMimeAsync,
  sanitizeStrategyFileName,
  STRATEGY_UPLOAD_MAX_BYTES,
} from "@/lib/strategy-upload-mime";
import type { StrategyPageAssetRow, StrategyPageRow } from "@/lib/types";

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

/** Ensures exactly one page row exists for the strategy (lazy create). */
export async function ensureStrategyPage(
  strategyId: string
): Promise<StrategyPageRow> {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const { data: existing } = await supabase
    .from("strategy_pages")
    .select("*")
    .eq("strategy_id", strategyId)
    .maybeSingle();

  if (existing) return existing as StrategyPageRow;

  const { data: inserted, error } = await supabase
    .from("strategy_pages")
    .insert({ strategy_id: strategyId, title: "Strategy page" })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: row } = await supabase
        .from("strategy_pages")
        .select("*")
        .eq("strategy_id", strategyId)
        .single();
      if (row) return row as StrategyPageRow;
    }
    throw new Error(clarifySupabaseTableError(error.message));
  }

  return inserted as StrategyPageRow;
}

export async function saveStrategyPage(
  strategyId: string,
  title: string,
  contentJson: JSONContent
) {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const { error } = await supabase.from("strategy_pages").upsert(
    {
      strategy_id: strategyId,
      title: title.trim() || "Strategy page",
      content_json: contentJson as Record<string, unknown>,
    },
    { onConflict: "strategy_id" }
  );

  if (error) throw new Error(clarifySupabaseTableError(error.message));

  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/edit`);
}

export async function uploadStrategyPageAsset(
  strategyId: string,
  pageId: string,
  formData: FormData
): Promise<{ asset: StrategyPageAssetRow; url: string }> {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const { data: page } = await supabase
    .from("strategy_pages")
    .select("id")
    .eq("id", pageId)
    .eq("strategy_id", strategyId)
    .maybeSingle();

  if (!page) throw new Error("Page not found");

  const raw = formData.get("file");
  if (!(raw instanceof Blob) || raw.size === 0) throw new Error("No file");
  if (raw.size > MAX_BYTES) throw new Error("File too large (max 50MB)");

  const displayName =
    raw instanceof File && raw.name ? raw.name : "upload";
  const mime = await resolveStrategyUploadMimeAsync(raw, displayName);
  if (!mime) {
    throw new Error(
      "Could not detect file type. Try renaming with an extension (.png, .pdf) or use a supported format."
    );
  }

  const safeName = sanitizeStrategyFileName(displayName);
  const objectPath = `${strategyId}/page/${pageId}/${randomUUID()}-${safeName}`;

  const buffer = Buffer.from(await raw.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType: mime, upsert: false });

  if (upErr) {
    throw new Error(`Storage: ${clarifySupabaseTableError(upErr.message)}`);
  }

  const assetType = mime.startsWith("image/") ? "image" : "file";

  const { data: row, error: dbErr } = await supabase
    .from("strategy_page_assets")
    .insert({
      strategy_page_id: pageId,
      type: assetType,
      file_name: displayName,
      mime_type: mime,
      size_bytes: raw.size,
      storage_path: objectPath,
    })
    .select("*")
    .single();

  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw new Error(clarifySupabaseTableError(dbErr.message));
  }

  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/edit`);

  const asset = row as StrategyPageAssetRow;
  const url = `/api/strategy-page-asset/${strategyId}/${asset.id}`;
  return { asset, url };
}

export async function deleteStrategyPageAsset(
  strategyId: string,
  assetId: string
) {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const { data: asset } = await supabase
    .from("strategy_page_assets")
    .select("id, storage_path, strategy_page_id")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) throw new Error("Not found");

  const { data: page } = await supabase
    .from("strategy_pages")
    .select("strategy_id")
    .eq("id", asset.strategy_page_id)
    .maybeSingle();

  if (!page || page.strategy_id !== strategyId) throw new Error("Not found");

  await supabase.storage.from(BUCKET).remove([asset.storage_path]);
  const { error } = await supabase
    .from("strategy_page_assets")
    .delete()
    .eq("id", assetId);

  if (error) throw new Error(clarifySupabaseTableError(error.message));

  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/edit`);
}
