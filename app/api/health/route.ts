import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { status: "ok", service: "strategy-vault" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
