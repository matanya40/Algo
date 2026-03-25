import { type NextRequest } from "next/server";

function enabled(): boolean {
  const v = process.env.AUTH_DEBUG_LOGS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** OAuth / auth tracing. Set AUTH_DEBUG_LOGS=1 in .env.local or Vercel. Never logs secrets or full ?code= values. */
export function authDebug(step: string, data: Record<string, unknown>): void {
  if (!enabled()) return;
  console.info(`[auth-debug] ${step}`, data);
}

export function authDebugRequestOrigin(request: NextRequest, computedOrigin: string): void {
  if (!enabled()) return;
  let requestHost = "";
  try {
    requestHost = new URL(request.url).host;
  } catch {
    requestHost = "(invalid request.url)";
  }
  authDebug("request-origin", {
    "host": request.headers.get("host"),
    "x-forwarded-host": request.headers.get("x-forwarded-host"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    "request.url host": requestHost,
    computedOrigin,
  });
}
