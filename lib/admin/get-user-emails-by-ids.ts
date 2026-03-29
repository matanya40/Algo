import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolves auth emails for user ids (server-only, service role).
 * Returns empty map if the admin client is not configured or a lookup fails.
 */
export async function getEmailsByUserIds(
  userIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(userIds)].filter((id) => id.length > 0);
  if (unique.length === 0) return out;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return out;
  }

  await Promise.all(
    unique.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error || !data.user?.email) return;
      out.set(id, data.user.email);
    })
  );

  return out;
}
