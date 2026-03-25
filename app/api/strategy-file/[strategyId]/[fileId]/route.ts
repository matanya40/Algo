import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "strategy-assets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ strategyId: string; fileId: string }> }
) {
  const { strategyId, fileId } = await params;
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

  const { data: row, error } = await supabase
    .from("strategy_files")
    .select("file_path, file_name, mime_type")
    .eq("id", fileId)
    .eq("strategy_id", strategyId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(row.file_path);

  if (dlErr || !blob) {
    return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const url = new URL(request.url);
  const inline = url.searchParams.get("view") === "1";

  const asciiName = row.file_name.replace(/[^\x20-\x7E]/g, "_");
  const cd = inline
    ? `inline; filename="${asciiName}"`
    : `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.file_name)}`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": row.mime_type || "application/octet-stream",
      "Content-Disposition": cd,
      "Cache-Control": "private, no-store",
    },
  });
}
