import { z } from "zod";

export const environmentSchema = z.enum(["demo", "live"]);

export const connectionCreateSchema = z.object({
  displayName: z.string().min(1).max(200),
  environment: environmentSchema,
  username: z.string().min(1).max(500),
  password: z.string().min(1).max(2000),
  /** Partner API — optional in Tradovate schema; omit from auth body when empty. */
  appId: z.string().max(500).default(""),
  appVersion: z.string().max(100).default("1.0"),
  cid: z.string().max(100).default(""),
  sec: z.string().max(2000).default(""),
});

export const connectionUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  environment: environmentSchema.optional(),
  username: z.string().min(1).max(500).optional(),
  password: z.union([z.string().max(2000), z.literal("")]).optional(),
  appId: z.string().max(500).optional(),
  appVersion: z.string().max(100).optional(),
  cid: z.string().max(100).optional(),
  sec: z.union([z.string().max(2000), z.literal("")]).optional(),
  isActive: z.boolean().optional(),
  deletedAt: z.union([z.string(), z.null()]).optional(),
});

/** Optional overrides when testing from the edit form (still server-side). */
export const connectionTestOverridesSchema = connectionCreateSchema.partial();
