import type { TradovateCredentials, TradovateEnvironment } from "@/lib/tradovate/types";

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

export function getTradovateBaseUrl(env: TradovateEnvironment): string {
  const demo =
    process.env.TRADOVATE_DEMO_BASE_URL?.trim() || "https://demo.tradovateapi.com";
  const live =
    process.env.TRADOVATE_LIVE_BASE_URL?.trim() || "https://live.tradovateapi.com";
  return env === "live" ? live : demo;
}

function unwrapList(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.d)) return o.d;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.errorText === "string") return o.errorText;
  if (typeof o.error === "string") return o.error;
  if (o.error && typeof o.error === "object") {
    const e = o.error as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
  }
  if (typeof o.message === "string") return o.message;
  return null;
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { parseError: true, raw: text.slice(0, 200) };
  }
}

function extractAccessToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const direct = [
    o.accessToken,
    o.access_token,
    o.mdAccessToken,
    o.md_access_token,
  ];
  for (const v of direct) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  if (o.d && typeof o.d === "object") {
    return extractAccessToken(o.d);
  }
  return null;
}

function responseKeyHint(data: unknown): string {
  if (!data || typeof data !== "object") return "(empty or non-JSON)";
  return Object.keys(data as object).slice(0, 12).join(", ") || "(no keys)";
}

/** Matches Tradovate docs: only `name` + `password` required; partner fields optional. */
export function buildAccessTokenRequestBody(
  creds: TradovateCredentials
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: creds.username,
    password: creds.password,
  };
  const appId = creds.appId?.trim();
  const appVersion = (creds.appVersion?.trim() || "1.0") as string;
  if (appId) {
    body.appId = appId;
    body.appVersion = appVersion;
  }
  const cidRaw = creds.cid?.trim();
  if (cidRaw) {
    const cidNum = Number(cidRaw);
    body.cid = Number.isFinite(cidNum) ? cidNum : cidRaw;
  }
  const sec = creds.sec?.trim();
  if (sec) body.sec = sec;
  return body;
}

export async function tradovateAccessToken(
  baseUrl: string,
  creds: TradovateCredentials
): Promise<string> {
  const body = buildAccessTokenRequestBody(creds);

  const url = `${normalizeBase(baseUrl)}/v1/auth/accesstokenrequest`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJsonSafe(res);
  const apiError = extractErrorMessage(data);
  if (!res.ok) {
    throw new Error(apiError || `Tradovate auth failed (HTTP ${res.status})`);
  }

  // Some responses are HTTP 200 but carry errorText instead of a token.
  if (apiError && !extractAccessToken(data)) {
    throw new Error(apiError);
  }

  const token = extractAccessToken(data);
  if (!token) {
    throw new Error(
      [
        "Tradovate did not return an access token.",
        "Common causes: wrong username/password, Demo vs Live mismatch, or your account requires App ID + CID + Secret from Tradovate.",
        `(Response fields: ${responseKeyHint(data)})`,
      ].join(" ")
    );
  }
  return token;
}

async function postList(
  baseUrl: string,
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<unknown[]> {
  const b = normalizeBase(baseUrl);
  const res = await fetch(`${b}/v1${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data) || `Tradovate request failed ${path} (${res.status})`
    );
  }
  return unwrapList(data);
}

export async function tradovateAccountList(
  baseUrl: string,
  token: string
): Promise<unknown[]> {
  const b = normalizeBase(baseUrl);
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  let res = await fetch(`${b}/v1/account/list`, { method: "GET", headers });
  if (!res.ok && (res.status === 405 || res.status === 404)) {
    res = await fetch(`${b}/v1/account/list`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
    });
  }
  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data) || `Tradovate account list (${res.status})`
    );
  }
  return unwrapList(data);
}

export async function tradovateFillList(
  baseUrl: string,
  token: string,
  accountId: number
): Promise<unknown[]> {
  try {
    return await postList(baseUrl, token, "/fill/list", { accountId });
  } catch {
    return postList(baseUrl, token, "/fill/list", { account: accountId });
  }
}

export async function tradovatePositionList(
  baseUrl: string,
  token: string,
  accountId: number
): Promise<unknown[]> {
  try {
    return await postList(baseUrl, token, "/position/list", { accountId });
  } catch {
    return postList(baseUrl, token, "/position/list", { account: accountId });
  }
}

export function pickNumericId(row: Record<string, unknown>): number | null {
  const id = row.id ?? row.accountId ?? row.account;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  return null;
}

export function externalAccountKey(row: Record<string, unknown>): string {
  const id = pickNumericId(row);
  if (id != null) return String(id);
  const n = row.name ?? row.nickname ?? row.accountName;
  if (typeof n === "string" && n.length > 0) return n;
  return JSON.stringify(row).slice(0, 120);
}
