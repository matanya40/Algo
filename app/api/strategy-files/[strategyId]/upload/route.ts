import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadStrategyFileFromFormData } from "@/lib/strategy-file-upload";

export const runtime = "nodejs";

/**
 * Multipart upload via fetch — avoids Next.js Server Action serialization issues with file rows.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  const { strategyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await _req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  try {
    const row = await uploadStrategyFileFromFormData(
      supabase,
      strategyId,
      formData
    );
    revalidatePath(`/strategies/${strategyId}`);
    revalidatePath(`/strategies/${strategyId}/edit`);
    revalidatePath("/dashboard");
    return NextResponse.json({ row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Not found" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
