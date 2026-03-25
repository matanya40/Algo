import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/openapi/build-spec";

export async function GET(request: Request) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const spec = buildOpenApiSpec(origin);
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
