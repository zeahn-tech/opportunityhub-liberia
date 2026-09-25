# OpportunityHub Liberia

A multi-tenant digital opportunity marketplace for Liberia — jobs, internships,
scholarships, tenders, and a confidential business-for-sale (M&A) exchange — built as
a React 19 SPA with an Express/Node server, backed by **Supabase (Postgres + Row-Level
Security)** for all data and authentication.

> This app is Supabase-backed in production. It is **not** a localStorage/in-memory
> demo — that in-memory data layer (`src/db/dbClient.ts`) exists only as an opt-in
> local-development fallback (see "Demo mode" below), not as the app's real data
> store. All nine domain services (`src/services/*.ts`) read and write through
> Supabase under Postgres RLS policies defined in `supabase/migrations/`.

---

## Architecture

- **Frontend**: React 19 SPA (Vite), lazy-loaded per-tab route chunks, Tailwind CSS.
- **Backend**: Express/Node server (`server.ts`) — serves the built SPA, verifies
  Supabase-issued JWTs server-side, handles Stripe webhooks, and proxies Gemini AI
  calls so the API key is never exposed to the browser.
- **Database & Auth**: Supabase — Postgres schema and RLS policies live in
  `supabase/migrations/` (one timestamped, reviewable file per change, applied via
  the Supabase CLI); Supabase Auth is the sole source of session/identity truth.
- **Payments**: Stripe (subscriptions, webhook-driven lifecycle updates).
- **AI**: Google Gemini, server-side only, with a heuristic `FallbackAIProvider` that
  keeps candidate matching and other AI-assisted features working if the API key is
  missing, invalid, or rate-limited.

See `docs/ARCHITECTURE.md` for the full breakdown, `docs/PROJECT_OVERVIEW.md` for the
product/domain model, and `docs/RLS_SECURITY_MODEL.md` +
`docs/RLS_SECURITY_TEST_MATRIX.md` for how authorization is enforced and verified.

## Deploying this app

**`docs/DEPLOYMENT.md` is the source of truth** for environment variables (client vs
server, clearly separated), applying Supabase migrations, seeding a fresh environment,
configuring Stripe webhooks and the Gemini API key, and CI/CD. Start there before
deploying anywhere.

## Getting started locally

```bash
npm ci
cp .env.example .env     # fill in real Supabase/Stripe/Gemini values, or see "Demo mode" below
npm run dev               # http://localhost:3000
```

### Demo mode

Setting `VITE_ENABLE_DEMO_MODE="true"` in `.env` lets the app fall back to an
in-memory seed dataset (`src/db/dbClient.ts`) for any request Supabase's real auth
rejects — useful for exploring the UI with zero backend setup. It is **not** how the
app runs in any real deployment; `src/config/env.ts` defaults this to `false` outside
development/test, and it must stay `false` anywhere handling real user data. See
`docs/DEPLOYMENT.md` → "Seeding a Fresh Environment" for the demo-vs-real distinction
in full, including a known gap: there is currently no seed script for populating a
*real* Supabase staging project with sample data (by design — this app's seed data
should never touch a real project; see that section for the recommended alternative).

## Testing & CI

```bash
npm run lint    # tsc --noEmit
npm test        # vitest run
npm run build   # production build (client + server bundles)
```

`.github/workflows/ci.yml` runs all of the above on every push/PR, plus:
- `npm run check:no-service-key-leak` — fails the build if `SUPABASE_SERVICE_ROLE_KEY`
  ever reaches the client bundle.
- `npm run check:no-secrets-committed` — fails if a real-looking secret value is
  committed anywhere, including `.env.example`.
- `npm run check:no-seed-pii-in-bundle` — a bundle-confidentiality regression gate;
  **currently fails** because of a known, still-open leak (see `docs/DEPLOYMENT.md`
  Section 4 and `docs/PHASE3_GAP_CLOSURE.md`) — it's wired in now so the leak stays
  visible until it's actually fixed, rather than being silently true.
- A separate `rls-security-tests` job that spins up a real ephemeral Postgres via the
  Supabase CLI, applies every migration, and runs the pgTAP RLS test matrix
  (`supabase/tests/rls_security_test_matrix.sql`) against it.

## Project status

This repository is worked through numbered phases, each documented as it lands. The
current state of every subsystem — architecture, auth, authorization, database/RLS,
security hardening, marketplace features, testing, performance, UI, and deployment —
is tracked in `docs/PRODUCTION_CERTIFICATION_REPORT.md`, including open findings and
known limitations stated plainly rather than glossed over. Read that document, not
this README, for an accurate picture of what's actually verified versus still open.
