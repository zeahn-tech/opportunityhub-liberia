# OpportunityHub Liberia — Supabase Foundation & Environment Architecture

## 1. Supabase Client Configuration
* **Browser Client (`src/lib/supabaseClient.ts`)**: Initializes a single singleton Supabase client using public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
* **Security Rule**: The service role secret (`SUPABASE_SERVICE_ROLE_KEY`) is strictly reserved for server-side operations (`server.ts`) and is never exposed to browser or client bundles.

## 2. Environment Architecture (`src/config/env.ts`)
* Supports `development`, `staging`, `production`, and `test` environments.
* Configures `VITE_ENABLE_DEMO_MODE`:
  * Default: `true` in `development` and `test`.
  * Default: `false` in `production` and `staging`.

## 3. Demo Mode Isolation
* When `VITE_ENABLE_DEMO_MODE=false`, demo seed user accounts and quick-switch role toolbars are completely disabled and hidden from the UI, ensuring production visitors never have access to mock authentication or persona switching.
