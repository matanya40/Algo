/**
 * Shared MIME allowlist for strategy file uploads (strategy_files + page assets).
 * Browsers often mis-report types (e.g. ZIP as application/x-zip-compressed on Windows).
 */

export const STRATEGY_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

/** Broad file picker hint — server still enforces this allowlist. */
export const STRATEGY_FILE_INPUT_ACCEPT =
  "image/*,.pdf,.csv,.zip,.rar,.7z,.tar,.gz,.tgz,.json,.txt,.md,.xml,.log,.yml,.yaml,.xlsx,.xls,.doc,.docx,.ppt,.pptx,.ods,.odt,.html,.htm";

const CANONICAL = new Set([
  // images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // text / structured
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "text/xml",
  "text/css",
  "text/yaml",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
  // archives (ZIP has several reported MIME names)
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-rar",
  "application/x-tar",
  "application/gzip",
  // documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
]);

/** Browser-reported MIME → canonical entry we store. */
const REPORTED_ALIASES: Record<string, string> = {
  "application/x-zip-compressed": "application/zip",
  "application/x-zip": "application/zip",
  "application/x-rar-compressed": "application/vnd.rar",
  "application/x-rar": "application/vnd.rar",
};

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  csv: "text/csv",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  cjs: "application/javascript",
  ts: "text/plain",
  tsx: "text/plain",
  jsx: "text/plain",
  py: "text/plain",
  log: "text/plain",
  yml: "text/yaml",
  yaml: "text/yaml",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  tgz: "application/gzip",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
};

function normalizeReportedMime(mime: string): string {
  const base = mime.toLowerCase().split(";")[0].trim();
  return REPORTED_ALIASES[base] ?? base;
}

function inferMimeFromFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".tar.gz")) {
    return CANONICAL.has("application/gzip") ? "application/gzip" : null;
  }
  if (lower.endsWith(".tgz")) {
    return CANONICAL.has("application/gzip") ? "application/gzip" : null;
  }
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1];
  if (!ext || !EXT_TO_MIME[ext]) return null;
  const inferred = EXT_TO_MIME[ext];
  return CANONICAL.has(inferred) ? inferred : null;
}

/**
 * Resolves a safe MIME for storage, or null if disallowed.
 * Handles empty/wrong `file.type` (common on Windows) via extension.
 */
export function resolveStrategyUploadMime(
  blob: Blob,
  fileName: string
): string | null {
  const t = blob.type?.trim();
  if (t && t !== "application/octet-stream") {
    const n = normalizeReportedMime(t);
    if (CANONICAL.has(n)) return n;
  }
  return inferMimeFromFileName(fileName);
}

export function sanitizeStrategyFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}
