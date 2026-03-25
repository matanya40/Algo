/**
 * Run SQL files against Supabase Postgres (direct connection).
 * Requires DATABASE_URL in .env.local (Dashboard → Settings → Database → URI).
 * Does not use the anon key — use a dev/staging project password, never commit the URL.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });
dotenv.config({ path: join(root, ".env") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "Missing DATABASE_URL. Add it to .env.local (Supabase → Project Settings → Database → Connection string → URI)."
  );
  process.exit(1);
}

const cmd = process.argv[2];
const files =
  cmd === "apply"
    ? ["supabase/schema.sql"]
    : cmd === "reset"
      ? ["supabase/schema-reset.sql"]
      : cmd === "rebuild"
        ? ["supabase/schema-reset.sql", "supabase/schema.sql"]
        : null;

if (!files) {
  console.error("Usage: npm run db:apply | db:reset | db:rebuild");
  process.exit(1);
}

const sql = postgres(url, { max: 1, idle_timeout: 2, connect_timeout: 30 });

async function run() {
  for (const rel of files) {
    const path = join(root, rel);
    const content = readFileSync(path, "utf8");
    console.log("→", rel);
    await sql.unsafe(content);
  }
  console.log("Done.");
}

run()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
