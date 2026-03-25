import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "strategy-assets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ strategyId: string; assetId: string }> }
) {
  const { strategyId, assetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: strat } = await supabase
    .from("strategies")
    .select("id")
    .eq("id", strategyId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!strat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: asset, error } = await supabase
    .from("strategy_page_assets")
    .select("id, storage_path, file_name, mime_type, strategy_page_id")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: page } = await supabase
    .from("strategy_pages")
    .select("strategy_id")
    .eq("id", asset.strategy_page_id)
    .maybeSingle();

  if (!page || page.strategy_id !== strategyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(asset.storage_path);

  if (dlErr || !blob) {
    return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const url = new URL(request.url);
  const inline = url.searchParams.get("view") === "1";

  const asciiName = asset.file_name.replace(/[^\x20-\x7E]/g, "_");
  const cd = inline
    ? `inline; filename="${asciiName}"`
    : `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(asset.file_name)}`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": asset.mime_type || "application/octet-stream",
      "Content-Disposition": cd,
      "Cache-Control": "private, no-store",
    },
  });
}
