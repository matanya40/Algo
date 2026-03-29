import { createClient } from "@/lib/supabase/server";

const BUCKET = "strategy-assets";

async function assertStrategyOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  strategyId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row, error } = await supabase
    .from("strategies")
    .select("id")
    .eq("id", strategyId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !row) throw new Error("Not found");
}

export async function deleteStrategyStorageAndRow(strategyId: string) {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const { data: files } = await supabase
    .from("strategy_files")
    .select("file_path")
    .eq("strategy_id", strategyId);

  const { data: pageRows } = await supabase
    .from("strategy_pages")
    .select("id")
    .eq("strategy_id", strategyId);

  const pageIds = (pageRows ?? []).map((p) => p.id);
  let pageAssetPaths: string[] = [];
  if (pageIds.length > 0) {
    const { data: pageAssets } = await supabase
      .from("strategy_page_assets")
      .select("storage_path")
      .in("strategy_page_id", pageIds);
    pageAssetPaths = (pageAssets ?? []).map((a) => a.storage_path);
  }

  const { data: blogPosts } = await supabase
    .from("strategy_blog_posts")
    .select("id")
    .eq("strategy_id", strategyId);

  const blogPostIds = (blogPosts ?? []).map((p) => p.id);
  let blogAssetPaths: string[] = [];
  if (blogPostIds.length > 0) {
    const { data: blogAssets } = await supabase
      .from("strategy_blog_assets")
      .select("storage_path")
      .in("blog_post_id", blogPostIds);
    blogAssetPaths = (blogAssets ?? []).map((a) => a.storage_path);
  }

  const paths = [
    ...(files ?? []).map((f) => f.file_path),
    ...pageAssetPaths,
    ...blogAssetPaths,
  ];
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const { error } = await supabase.from("strategies").delete().eq("id", strategyId);
  if (error) throw new Error(error.message);
}
