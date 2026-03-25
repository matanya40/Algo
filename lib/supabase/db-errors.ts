/**
 * PostgREST errors when tables/bucket were never created in the Supabase project.
 */
export function clarifySupabaseTableError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("schema cache") ||
    m.includes("pgrst205") ||
    m.includes("could not find the table")
  ) {
    return (
      "Database not initialized: open Supabase → SQL Editor, paste the full file " +
      "supabase/schema.sql from this project, click Run, wait a few seconds, then refresh."
    );
  }
  if (m.includes("bucket not found") || m.includes("storage object not found")) {
    return (
      "Storage bucket missing: run supabase/schema.sql in SQL Editor (creates bucket strategy-assets), then try again."
    );
  }
  return message;
}
