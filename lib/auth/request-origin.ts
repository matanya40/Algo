import { type NextRequest } from "next/server";

/** Public origin for redirects (respects Vercel x-forwarded-* headers). */
export function getRequestOrigin(request: NextRequest): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? url.host;
  const proto =
    forwardedProto || url.protocol.replace(":", "") || "http";
  return `${proto}://${host}`;
}
