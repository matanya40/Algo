# Strategy Vault

Internal web app for documenting trading strategies: NinjaTrader / backtest context, metrics, files, screenshots, installation notes, optional rich documentation pages, and status — backed by **Supabase** (Postgres, Auth, Storage) and **Next.js 15** (App Router).

## Stack

- Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui-style components
- Supabase: Google OAuth, Row Level Security, Storage bucket `strategy-assets`
- Rich docs: Tiptap (JSON) in `strategy_pages`; uploads in `strategy_page_assets`
- Deploy: Vercel (Hobby-friendly)

## Production deployment (Vercel)

Live app: [https://algo-seven-kappa.vercel.app](https://algo-seven-kappa.vercel.app) (login: `/login`).

Use these values in **Supabase (production)** → **Authentication** → **URL configuration**:

| Setting | Value |
|--------|--------|
| **Site URL** | `https://algo-seven-kappa.vercel.app` (not `http://localhost:3000` — otherwise OAuth can send users back to localhost) |
| **Redirect URLs** | `https://algo-seven-kappa.vercel.app/auth/callback` (and keep `http://localhost:3000/auth/callback` for local dev) |

In **Vercel → Environment Variables**, add **`NEXT_PUBLIC_SITE_URL`** = `https://algo-seven-kappa.vercel.app` (no trailing slash). The login button uses this so `redirectTo` always matches production, even if your browser or proxy reports the wrong origin.

If you use **Google OAuth**, add the same callback under your Google Cloud OAuth client **Authorized redirect URIs** when required (often Supabase handles the Google redirect; follow [Supabase Google login docs](https://supabase.com/docs/guides/auth/social-login/auth-google) if sign-in fails).

## Prerequisites

- Node.js 20+
- Recommended: separate Supabase projects for **development** and **production** (isolated data and keys)

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. In Supabase (dev project), open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). Re-run the same file on **production** when that project is ready.

3. In Supabase **Authentication → Providers**, enable **Google** and add the Client ID / Secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth 2.0 Client, type “Web application”).

4. Under **Authentication → URL configuration**, set:

   - **Site URL**: `http://localhost:3000` (dev) or your deployed URL
   - **Redirect URLs**: include `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

5. Copy [`.env.example`](.env.example) to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings → API** (dev project).

6. Run the app:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000), sign in with Google, then create a strategy from the dashboard.

### If sign-in fails or you loop back to login

- Supabase **Redirect URLs** must match the app: `…/auth/callback` (e.g. `http://localhost:3000/auth/callback`).
- In Google Cloud Console, under the OAuth client, add the same URL under **Authorized redirect URIs** (in addition to Supabase’s own callback URL if required).
- After changing Vercel domain: update **Site URL** and **Redirect URLs** in Supabase to your live URL (`https://…`). The callback route uses forwarded host/proto so OAuth works behind a proxy.

## Production checklist (what must be done for prod)

| Step | Action |
|------|--------|
| 1 | Run [`supabase/schema.sql`](supabase/schema.sql) in the **production** Supabase project (SQL Editor). |
| 2 | In **Vercel → Environment Variables**, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (prod project), and **`NEXT_PUBLIC_SITE_URL`** = `https://algo-seven-kappa.vercel.app` so OAuth returns to Vercel, not localhost. |
| 3 | In Supabase **prod** → **Authentication → URL configuration**: **Site URL** `https://algo-seven-kappa.vercel.app` and redirect `https://algo-seven-kappa.vercel.app/auth/callback` (see table above). |
| 4 | In **Google Cloud** OAuth client, add the same production redirect URLs if you use Google sign-in. |
| 5 | Redeploy after env changes (or trigger a new deployment). |

Nothing else is required in the repo for a basic production deploy; optional: `NEXT_PUBLIC_APP_ENV` for a label in the UI.

## Staging / Preview (Vercel)

1. Use a dedicated Supabase project for staging; run `supabase/schema.sql` and configure OAuth redirect URLs for the staging URL.

2. For **Preview** or staging in Vercel, set:

   - `NEXT_PUBLIC_SUPABASE_URL` → staging Supabase URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging anon key  
   - Optionally `NEXT_PUBLIC_APP_ENV=staging`

3. Do **not** reuse dev keys on staging if you want isolated users and data.

See [Vercel environment variables](https://vercel.com/docs/projects/environment-variables).

## Database overview

- `profiles` — linked to `auth.users`
- `strategies` — core entity (`owner_id` = current user)
- `strategy_metrics` — one row per strategy (`unique(strategy_id)`)
- `strategy_files` — metadata; binaries in Storage under `{strategy_id}/...`
- `strategy_pages` — optional Tiptap JSON documentation per strategy (`unique(strategy_id)`)
- `strategy_page_assets` — page attachments; Storage paths under `{strategy_id}/page/{page_id}/...`

RLS restricts access to the signed-in owner. Storage policies use the first path segment as `strategy_id`.

## Scripts

| Command         | Description |
|-----------------|-------------|
| `npm run dev`   | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint`  | ESLint |
| `npm run db:apply` / `db:reset` / `db:rebuild` | Optional local DB scripts (requires `DATABASE_URL` in `.env`) |

## Routes

- `/login` — Google sign-in  
- `/auth/callback` — OAuth callback  
- `/dashboard` — list, search, status filter  
- `/strategies/new` — create  
- `/strategies/[id]` — detail, files, optional strategy page  
- `/strategies/[id]/edit` — edit + metrics + documentation tab  
- `/settings` — theme (light / dark / system)  
- `/docs` — Swagger UI (via `/api/docs-frame`) + OpenAPI at `/api/openapi`

### HTTP API (documented in Swagger)

- `GET /api/health` — health check  
- `GET /api/openapi` — OpenAPI 3 JSON  
- `GET /api/v1/strategies` — list (session cookie; optional `q`, `status`)  
- `GET /api/v1/strategies/[id]` — single strategy  

Writes use Server Actions + Supabase; these routes are read-only JSON.

## License

Private / internal use.
