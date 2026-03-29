import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_PAGES = 25;

/**
 * Resolves auth user id by email via Admin API (paginated list).
 * Suitable for small-to-medium user bases; returns null if not found.
 */
export async function findUserIdByEmail(
  admin: SupabaseClient,
  normalizedEmail: string
): Promise<string | null> {
  const target = normalizedEmail.toLowerCase().trim();
  if (!target) return null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw new Error(error.message);
    }
    const users = data?.users ?? [];
    const hit = users.find(
      (u) => (u.email ?? "").toLowerCase().trim() === target
    );
    if (hit?.id) return hit.id;
    if (users.length < 200) break;
  }
  return null;
}
