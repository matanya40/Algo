"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import {
  assertStrategyOwner,
} from "@/lib/strategy-file-upload";
import {
  normalizeDocumentationTabs,
  type StrategyDocTab,
  type StrategyDocTabAsset,
} from "@/lib/strategy-doc-tabs";
import {
  resolveStrategyUploadMimeAsync,
  sanitizeStrategyFileName,
  STRATEGY_UPLOAD_MAX_BYTES,
} from "@/lib/strategy-upload-mime";
import { randomUUID } from "crypto";

const BUCKET = "strategy-assets";
const MAX_BYTES = STRATEGY_UPLOAD_MAX_BYTES;

const TAB_ID_RE = /^[a-z0-9-]+$/;

function docTabPathPrefix(strategyId: string, tabId: string) {
  return `${strategyId}/doc-tabs/${tabId}/`;
}

async function loadTabs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  strategyId: string
): Promise<StrategyDocTab[]> {
  const { data, error } = await supabase
    .from("strategies")
    .select("documentation_tabs")
    .eq("id", strategyId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(clarifySupabaseTableError(error?.message ?? "Load failed"));
  }
  return normalizeDocumentationTabs(data.documentation_tabs);
}

async function saveTabs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  strategyId: string,
  tabs: StrategyDocTab[]
) {
  const { error } = await supabase
    .from("strategies")
    .update({ documentation_tabs: tabs })
    .eq("id", strategyId);

  if (error) {
    throw new Error(clarifySupabaseTableError(error.message));
  }
}

export async function updateStrategyDocumentationTabs(
  strategyId: string,
  tabs: StrategyDocTab[]
) {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);
  const normalized = normalizeDocumentationTabs(tabs);
  await saveTabs(supabase, strategyId, normalized);
  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/edit`);
}

export async function uploadStrategyDocTabAsset(
  strategyId: string,
  tabId: string,
  formData: FormData
): Promise<{ ok: true; asset: StrategyDocTabAsset }> {
  if (!TAB_ID_RE.test(tabId)) {
    throw new Error("Invalid tab");
  }

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
  const mime = await resolveStrategyUploadMimeAsync(raw, displayName);
  if (!mime) {
    throw new Error(
      "Could not detect file type. Use a known extension (.png, .pdf, …)."
    );
  }

  const tabs = await loadTabs(supabase, strategyId);
  const idx = tabs.findIndex((t) => t.id === tabId);
  if (idx < 0) throw new Error("Tab not found");

  const prev = tabs[idx].asset;
  if (prev?.storagePath) {
    await supabase.storage.from(BUCKET).remove([prev.storagePath]);
  }

  const safeName = sanitizeStrategyFileName(displayName);
  const objectPath = `${docTabPathPrefix(strategyId, tabId)}${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await raw.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType: mime, upsert: false });

  if (upErr) {
    throw new Error(`Storage: ${clarifySupabaseTableError(upErr.message)}`);
  }

  const kind: StrategyDocTabAsset["kind"] = mime.startsWith("image/")
    ? "image"
    : "file";
  const asset: StrategyDocTabAsset = {
    kind,
    storagePath: objectPath,
    fileName: displayName,
    mimeType: mime,
  };

  tabs[idx] = { ...tabs[idx], asset };
  await saveTabs(supabase, strategyId, tabs);

  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/edit`);
  return { ok: true, asset };
}

export async function removeStrategyDocTabAsset(strategyId: string, tabId: string) {
  if (!TAB_ID_RE.test(tabId)) {
    throw new Error("Invalid tab");
  }

  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const tabs = await loadTabs(supabase, strategyId);
  const idx = tabs.findIndex((t) => t.id === tabId);
  if (idx < 0) throw new Error("Tab not found");

  const prev = tabs[idx].asset;
  if (prev?.storagePath) {
    await supabase.storage.from(BUCKET).remove([prev.storagePath]);
  }
  tabs[idx] = { ...tabs[idx], asset: null };
  await saveTabs(supabase, strategyId, tabs);

  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/edit`);
}
