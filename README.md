# Strategy Vault

Internal web app for documenting trading strategies: NinjaTrader / backtest context, metrics, files, screenshots, installation notes, and status — backed by **Supabase** (Postgres, Auth, Storage) and **Next.js 15** (App Router).

## Stack

- Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui-style components
- Supabase: Google OAuth, Row Level Security, Storage bucket `strategy-assets`
- Deploy: Vercel (Hobby-friendly)

## Prerequisites

- Node.js 20+
- Two Supabase projects recommended: **development** and **staging** (isolated data and users)

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. In Supabase (dev project), open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). Run the same file on your **staging** project when you create it.

3. In Supabase **Authentication → Providers**, enable **Google** and add the Client ID / Secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth 2.0 Client, type “Web application”).

4. Under **Authentication → URL configuration**, set:

   - **Site URL**: `http://localhost:3000` (dev) or your staging URL
   - **Redirect URLs**: include `http://localhost:3000/auth/callback` and `https://<your-staging-domain>/auth/callback`

5. Copy [`.env.example`](.env.example) to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings → API** (dev project).

6. Run the app:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000), sign in with Google, then create a strategy from the dashboard.

### אם ההתחברות “נכשלת” או ה־redirect חוזר ל־login

- ב־Supabase חייב להופיע בדיוק אותו כתובת callback כמו בקוד: `…/auth/callback` (למשל `http://localhost:3000/auth/callback`).
- ב־Google Cloud Console, ב־OAuth client, הוסף אותה כתובת תחת **Authorized redirect URIs** (בנוסף ל־URL ש־Supabase נותן לפרויקט).
- אחרי שינוי ב־Vercel: עדכן **Site URL** ו־**Redirect URLs** ב־Supabase לדומיין האמיתי (`https://…`). נתיב ה־callback משתמש ב־`x-forwarded-host` / `x-forwarded-proto` כדי שה־redirect אחרי Google לא יישבר מאחורי proxy.

## Staging (Vercel)

1. Create a **second** Supabase project for staging; run `supabase/schema.sql` and configure Google OAuth redirect URLs for your Vercel staging URL.

2. Connect the Git repo to Vercel. For the **Preview** or **staging** deployment environment, set:

   - `NEXT_PUBLIC_SUPABASE_URL` → staging Supabase URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging anon key  
   - Optionally `NEXT_PUBLIC_APP_ENV=staging` for the environment badge

3. Do **not** reuse dev keys on staging if you want separate users and data.

See [Vercel environment variables](https://vercel.com/docs/projects/environment-variables).

## Database overview

- `profiles` — linked to `auth.users`
- `strategies` — core entity (`owner_id` = current user)
- `strategy_metrics` — one row per strategy (`unique(strategy_id)`)
- `strategy_files` — metadata; binaries in Storage under `{strategy_id}/...`

RLS restricts all access to rows owned by the signed-in user. Storage policies match the same ownership via the first path segment (`strategy_id`).

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Dev server (Turbopack) |
| `npm run build`| Production build   |
| `npm run start`| Start production server |
| `npm run lint` | ESLint             |

## Routes

- `/login` — Google sign-in  
- `/auth/callback` — OAuth callback  
- `/dashboard` — list, search, status filter  
- `/strategies/new` — create  
- `/strategies/[id]` — detail, files, delete  
- `/strategies/[id]/edit` — edit + metrics  
- `/settings` — theme (light / dark / system)  
- `/docs` — **Swagger UI** (embedded via `/api/docs-frame`, isolated from app CSS) + OpenAPI at `/api/openapi`

### HTTP API (documented in Swagger)

- `GET /api/health` — public health check  
- `GET /api/openapi` — public OpenAPI 3 JSON spec  
- `GET /api/v1/strategies` — list strategies (session cookie; optional `q`, `status` query params)  
- `GET /api/v1/strategies/[id]` — single strategy (session cookie)

Writes in the app remain **Server Actions** + Supabase; these routes are read-only JSON for tools and exploration.

## License

Private / internal use.
