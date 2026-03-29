import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "strategy-assets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  const { strategyId } = await params;
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!decoded.startsWith(`${strategyId}/doc-tabs/`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

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
    .maybeSingle();

  if (!strat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(decoded);

  if (dlErr || !blob) {
    return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const inline = url.searchParams.get("view") === "1";
  const mimeParam = url.searchParams.get("mime");
  const fileName = decoded.split("/").pop() ?? "file";
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, "_");
  const mime =
    mimeParam && mimeParam.length > 0
      ? mimeParam
      : decoded.toLowerCase().endsWith(".png")
        ? "image/png"
        : decoded.toLowerCase().endsWith(".jpg") || decoded.toLowerCase().endsWith(".jpeg")
          ? "image/jpeg"
          : decoded.toLowerCase().endsWith(".webp")
            ? "image/webp"
            : decoded.toLowerCase().endsWith(".gif")
              ? "image/gif"
              : decoded.toLowerCase().endsWith(".pdf")
                ? "application/pdf"
                : "application/octet-stream";

  const cd = inline
    ? `inline; filename="${asciiName}"`
    : `attachment; filename="${asciiName}"`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": cd,
      "Cache-Control": "private, no-store",
    },
  });
}
