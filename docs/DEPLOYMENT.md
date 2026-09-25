# OpportunityHub Liberia — Deployment Blueprint

This document details the configuration, continuous integration, containerization, and production deployment guidelines for OpportunityHub Liberia.

---

## 1. System Architecture

The application is engineered as a fully consolidated full-stack web application hosted on **Google Cloud Run** or **Docker-capable container runtimes**:
- **Frontend Layer**: React 19 SPA served through Vite static asset compilation.
- **Backend Service**: Express Node.js process serving secure API routes (`/api/*`), handling Gemini server-side AI requests, and webhook processing.
- **Reverse Proxy / Server Ingress**: Handled via Nginx or Cloud Run native proxy routing external traffic to port `3000`.

---

## 2. Environment Variables — Client vs Server

Every variable below is documented, as a placeholder, in `.env.example` — copy it to
`.env` locally and fill in real values, or set the same names as secrets in your
hosting platform for production. The split below is the one that actually matters:
**anything prefixed `VITE_` is compiled into the public browser bundle by Vite; anything
without that prefix is read only by the Node server process (`server.ts` / `dist/server.cjs`)
and is never bundled for the browser.** Get this wrong in either direction and you either
break the app (server var referenced from client code, `undefined` at runtime) or leak a
secret (server-only var accidentally read via `import.meta.env` in `src/`).

### Client-bundled (safe to expose in the browser — prefixed `VITE_`)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project API URL. Public by design. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key. Public by design — every request made with it is still subject to RLS (see `supabase/migrations/`). |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key, for client-side Stripe Elements/Checkout. |
| `VITE_STRIPE_BASIC_MONTHLY_PRICE_ID`, `VITE_STRIPE_BASIC_ANNUAL_PRICE_ID`, `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`, `VITE_STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe Price IDs shown in the pricing/subscription UI. Not secret, but must match real Prices in your Stripe dashboard. |
| `VITE_APP_ENV`, `VITE_API_BASE_URL`, `VITE_DEFAULT_CURRENCY`, `VITE_ENABLE_LOW_BANDWIDTH_MODE`, `VITE_PWA_ENABLED` | App configuration, no secrecy requirement. |
| `VITE_ENABLE_DEMO_MODE` | See Section 7 (Seeding) below. Should be `"false"` in any real deployment. |
| `APP_URL` | Public URL this app is hosted at (OAuth callbacks, self-referential links). Not secret, but not `VITE_`-prefixed for historical reasons (AI Studio injects it directly); `server.ts` reads it via `process.env`. |

### Server-only (never expose, never prefix with `VITE_`)

| Variable | Purpose | Where it's used |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS entirely. Server-side admin/back-office operations only. | Guarded by `npm run check:no-service-key-leak` (CI, see Section 4) — fails the build if this ever appears under `src/` or in the client `dist/` bundle. |
| `STRIPE_SECRET_KEY` | Server-side Stripe API calls (creating checkout sessions, etc). | `server.ts` only. |
| `STRIPE_WEBHOOK_SECRET` | Verifies that incoming `/api/webhooks/stripe` requests actually came from Stripe. See Section 8 below for how to obtain and configure it. | `server.ts` only. |
| `GEMINI_API_KEY` | Server-side Gemini API calls (AI matching, CV parsing, etc). | `server.ts` only — the client never calls Gemini directly. |
| `SESSION_EXPIRY_DAYS`, `ENCRYPTION_SECRET` | Server session/security configuration. | `server.ts` only. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `DEFAULT_FROM_EMAIL` | Outbound transactional email. | `server.ts` only. |

All four of `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
`GEMINI_API_KEY` are checked by `npm run check:no-secrets-committed` (see Section 4) to
confirm `.env.example` only ever holds placeholders for them and that no git-tracked file
contains a real-looking value for any of them.



---

## 2a. Supabase Environment Variable Contract

The Supabase backend (`supabase/migrations/`) is CLI-managed and **is the live data
source** — all nine domain services (`src/services/*.ts`) read/write through it under
RLS; `src/db/dbClient.ts`'s in-memory store is used only as the Phase-3-era migration
scaffold and, still, for `VITE_ENABLE_DEMO_MODE` (see Section 7). This contract governs
how the three Supabase variables are used:

| Variable | Where it lives | Client-bundled? | Respects RLS? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` / deployment secret, read via `import.meta.env` (see `src/config/env.ts`) | **Yes** — safe, it's just the project's public API endpoint | n/a |
| `VITE_SUPABASE_ANON_KEY` | Same as above | **Yes** — safe by design; every request made with it is subject to the RLS policies in `supabase/migrations/` | **Yes**, always |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only deployment secret (e.g. Cloud Run env var / Secret Manager) — **never** given a `VITE_` prefix | **No — must never appear under `src/` or in the built `dist/` client bundle** | **No — bypasses RLS entirely** |

Rules:
1. Only variables prefixed `VITE_` are exposed to the browser by Vite. `SUPABASE_SERVICE_ROLE_KEY`
   is intentionally unprefixed so it is never bundled — do not rename it to add a `VITE_` prefix.
2. Any server-side code that needs the service-role key (webhooks, admin/back-office
   operations, trusted server-to-server writes) must live in `server.ts` or another
   Node-only entry point that Vite does not bundle for the browser — never in `src/`.
3. `npm run check:no-service-key-leak` (wired into CI, see Section 4) greps both
   `src/` and the built `dist/` client bundle for `SUPABASE_SERVICE_ROLE_KEY` /
   `service_role` and fails the build if either is found outside `dist/server.cjs`.
4. `.env.example` documents the exact shape expected; copy it to `.env` locally
   and fill in real values from **Project Settings → API** in the Supabase dashboard.

---

## 3. Containerization (Dockerfile)

A production-optimized, multi-stage Docker build guarantees minimal container layer sizes, caching optimizations, and secure execution boundaries.

```dockerfile
# STAGE 1: Build & Packaging
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# STAGE 2: Secure Execution Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

# Copy compiled static assets and server bundles from Stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Run container as a non-privileged system user for process containment
USER node

CMD ["npm", "start"]
```

---

## 4. CI/CD Deployment Pipeline (GitHub Actions)

`.github/workflows/ci.yml` (already present in this repo) runs on every push/PR to
`main`, across two jobs:

**`validate`** — `npm ci` → `npm run lint` (`tsc --noEmit`) → `npm test` (vitest) →
`npm run build` → `npm run check:no-service-key-leak` (fails if `SUPABASE_SERVICE_ROLE_KEY`
or a service-role client ever shows up in the client bundle) → `npm run check:no-secrets-committed`
(fails if `.env.example` or any tracked file has a real-looking secret value) →
`npm run check:no-seed-pii-in-bundle` (fails if any known seed-user email or the seeded
admin password hash appears in the client bundle — **currently fails**, see the "Known
Limitations" callout below) → `gitleaks/gitleaks-action@v2` (pattern-based secret scan
of the diff/repo, as a second line of defense alongside GitHub's own built-in secret
scanning — see "Secret hygiene" below).

**`rls-security-tests`** — uses `supabase/setup-cli@v1` and `supabase start` to spin up
a real, ephemeral local Postgres via Docker (preinstalled on GitHub-hosted runners),
which applies every migration in `supabase/migrations/` including the one that enables
pgTAP. It then runs `supabase/tests/rls_security_test_matrix.sql` against that instance
and fails the job if any assertion reports `not ok`. The test file wraps its own
fixtures and every assertion in `begin; ... rollback;`, so nothing persists even though
the instance itself is ephemeral anyway.

> **Optional secrets for full test coverage**: 164 of 166 vitest tests are fully
> self-contained. The remaining 2 (`organizations.test.ts`) call `AuthService.login()`
> against a real Supabase Auth endpoint and will report "fetch failed" unless you add
> `SUPABASE_TEST_URL` / `SUPABASE_TEST_ANON_KEY` as repository secrets (**Settings →
> Secrets and variables → Actions**), pointing at a real, ideally disposable/staging
> Supabase project — the `validate` job's test step already reads them if present.
> Without them, expect exactly 2 known failures in that step; this is a pre-existing
> test-isolation gap, not something this phase introduced.

> **Known limitation, stated plainly**: `npm run check:no-seed-pii-in-bundle` is wired
> in as a **regression gate**, and it is expected to currently **fail** CI. Phase 3
> found `src/db/dbClient.ts`'s `SEED_USERS` array (real-looking candidate/employer
> emails, one password hash) shipping in the production client bundle regardless of
> demo-mode configuration, and that specific leak was never fixed — `authService.ts`,
> `permissionEngine.ts`, and `TrustSafetyAdminCenter.tsx` all still statically import
> `dbClient.ts`, so it rides into the bundle eagerly at module load. See
> `docs/PHASE3_GAP_CLOSURE.md` and the certification report's Performance/UI Status
> sections for why a full fix needs a dedicated async refactor rather than a quick
> patch. The check exists now so that (a) this is visible and tracked instead of
> silently true, and (b) once the refactor lands, the exact same check immediately
> proves it and guards against the leak silently coming back.

Deployment itself is a separate step; create a workflow file in your repository at
`.github/workflows/deploy.yml` to orchestrate containerization and deployment on top
of `validate`/`rls-security-tests` passing.

```yaml
name: Production Deployment Pipeline

on:
  push:
    branches: [ main ]

jobs:
  validate-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - name: Install Dependencies
        run: npm ci
      - name: Quality Linter Check
        run: npm run lint
      - name: Run Test Suite
        run: npm test -- --run

  deploy-container:
    needs: validate-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker authentication
        run: gcloud auth configure-docker

      - name: Build and Push Docker Image
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/opphub-app:latest .
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/opphub-app:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy opphub-service \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/opphub-app:latest \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated \
            --port 3000 \
            --set-env-vars NODE_ENV=production
```

---

## 5. Domain Configuration & HTTPS Routing

To deploy the application under a custom domain:
1. **DNS Mapping**: Map your domain (e.g. `opportunityhubliberia.com`) to Google Cloud Run or your hosting load balancer using a `CNAME` or `A` record.
2. **Strict HTTPS Enforcements**:
   - Cloud Run automatically provisions and rotates **Let's Encrypt SSL Certificates** on custom domains.
   - All HTTP traffic is redirected automatically to secure HTTPS by the load balancer.
3. **PWA Compliance**: A valid HTTPS setup is **mandatory** for service workers to initialize and support the in-app PWA install prompts.

---

## 6. Supabase Backend Setup & Migrations

The database schema lives in `supabase/migrations/` (Supabase CLI convention — one
timestamped, reviewable SQL file per change) rather than a single `schema.sql`.
To provision a fresh Supabase project:

```bash
# 1. Install the CLI (already a documented devDependency-equivalent via npx)
npx supabase login

# 2. Link this repo to your Supabase project (finds the ref in your dashboard URL)
npx supabase link --project-ref <your-project-ref>

# 3. Apply every migration in supabase/migrations/, in order, to that project
npx supabase db push

# 4. Confirm RLS is enabled everywhere and the anon/service-role boundary holds
npx tsx scripts/verify-supabase-connection.ts
```

`supabase db push` applies migrations in filename (timestamp) order, so it works
identically on a brand-new project and on one that already has some of these
migrations applied. Adding a new migration going forward:

```bash
npx supabase migration new <short_description>
# edit the generated supabase/migrations/<timestamp>_<short_description>.sql
npx supabase db push
```

**Status as of this phase**: all 22 migrations in `supabase/migrations/` — including
the RLS policies for every table, the pgTAP-enabling migration, and both perf-fix
migrations — are applied to the live project and are the actual runtime data source
for all nine domain services. `scripts/verify-supabase-connection.ts` and
`supabase/tests/rls_security_test_matrix.sql` (112 assertions, see
`docs/RLS_SECURITY_TEST_MATRIX.md`) are the two verification tools; the latter now
also runs automatically in CI (Section 4). See
`docs/PRODUCTION_CERTIFICATION_REPORT.md` → "Database Status" and "Row-Level Security
(RLS) & Multi-Tenancy Status" for the full detail, including the open findings
(suspended-account sessions not rejected by RLS; `organizations` over-exposure;
`verification_officer` role non-functional at the DB level) that suite surfaced.

---

## 7. Seeding a Fresh Environment — Demo vs Real

There are two distinct, non-overlapping ways this app gets data, and they must not be
mixed in a real deployment:

**Demo mode** (`VITE_ENABLE_DEMO_MODE="true"`) — the client falls back to
`src/db/dbClient.ts`'s in-memory `SEED_USERS`/seed dataset for any request Supabase's
real auth rejects. This is meant for local development and demos only, needs no setup
(the seed data is baked into the bundle — see the CI callout in Section 4 about why
that's also a known confidentiality issue, not just a convenience), and **must be
`"false"` in any deployment handling real user data**. `src/config/env.ts` already
defaults this to `false` outside development/test.

**Real Supabase-backed environment** (`VITE_ENABLE_DEMO_MODE="false"`, the required
setting for anything beyond local dev) — after applying migrations (Section 6), the
project has schema and RLS policies but **no seed data**, by design: none of this
app's seed/demo data should ever populate a real project. There is currently no
dedicated `supabase/seed.sql` or seeding script in this repo for populating a fresh
real environment with sample data — that's a genuine gap, not an oversight being
glossed over here. If you need sample data in a staging Supabase project (as opposed
to production, which should start empty), either:
- Sign up through the app's own UI to create real `auth.users` rows the normal way
  (recommended — exercises the actual registration/RLS path), or
- Write a project-specific `supabase/seed.sql` using `supabase/migrations/*.sql`'s
  table shapes as the reference and run it with `supabase db reset` (local) or
  `psql "$SUPABASE_DB_URL" -f supabase/seed.sql` (remote) — not provided here because
  its contents should never resemble `dbClient.ts`'s real-looking seed emails.

**Production** should never be seeded with sample data at all — only real user
sign-ups via the app's registration flow.

---

## 8. Configuring Stripe Webhooks & the Gemini API Key

### Stripe webhook
1. In the Stripe Dashboard (use the **live** mode toggle for production, **test** mode
   for staging), go to **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://<your-deployed-domain>/api/webhooks/stripe` (the Express
   route in `server.ts` that handles subscription lifecycle events).
3. Select the events this app's `subscriptionService`/webhook handler expects
   (at minimum: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`) — check `server.ts` for
   the exact set currently handled if you're adding new event types.
4. After creating the endpoint, Stripe shows a **Signing secret** (`whsec_...`) —
   set this as the `STRIPE_WEBHOOK_SECRET` environment variable in your hosting
   platform's secret manager. **Never** commit it or put it in `.env.example`.
5. Set `STRIPE_SECRET_KEY` (from **Developers → API keys**) the same way, and
   `VITE_STRIPE_PUBLIC_KEY` (the publishable key — safe to be client-bundled) plus the
   four `VITE_STRIPE_*_PRICE_ID` variables from **Product catalog → Prices**.
6. Send a test webhook from the Stripe Dashboard's endpoint detail page to confirm
   `server.ts` returns `200` before going live.

### Gemini API key
1. Create or select a key in [Google AI Studio](https://aistudio.google.com/apikey)
   (or Google Cloud's Vertex AI console, if using that instead).
2. Set it as the `GEMINI_API_KEY` environment variable in your hosting platform's
   secret manager — **server-side only**, never `VITE_`-prefixed. The client never
   calls the Gemini API directly; all AI features (candidate matching, CV parsing,
   the AI assistant) proxy through `server.ts`, which is also why `FallbackAIProvider`
   (heuristic, non-AI scoring) exists as a degrade path if the key is missing, invalid,
   or rate-limited — the app stays functional either way, just less smart.
3. No webhook or callback configuration is needed for Gemini, unlike Stripe.

---

## 9. Secret Hygiene

- `.env.example` must only ever contain placeholder values — verified automatically by
  `npm run check:no-secrets-committed` (Section 4). Never fill in a real key and commit it,
  even temporarily.
- GitHub's built-in secret scanning is automatically enabled on public repositories
  (this repo's visibility as of this writing) at no cost, with no toggle needed;
  confirm it's active and review any open alerts under the repo's **Settings → Code
  security → Secret scanning**. If the repo is ever made private, secret scanning must
  be explicitly enabled from that same settings page (it is not automatic on private
  repos without GitHub Advanced Security). Consider also enabling **push protection**
  there, which blocks a push containing a recognized secret pattern before it ever
  reaches the repo, rather than only alerting after the fact.
- `gitleaks/gitleaks-action@v2` runs in CI (Section 4) as a second, pattern-based line
  of defense — it doesn't depend on GitHub's own scanning being enabled and catches
  provider-specific key shapes (Stripe, Google/Gemini, generic high-entropy strings) in
  the diff being pushed.
- If a real secret is ever accidentally committed: rotate it immediately at the
  provider (Supabase/Stripe/Google) — removing it from git history alone is not
  sufficient once it's been pushed, since it may already be cached/indexed.
