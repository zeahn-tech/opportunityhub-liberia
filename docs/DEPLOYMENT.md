# OpportunityHub Liberia — Deployment Blueprint

This document details the configuration, continuous integration, containerization, and production deployment guidelines for OpportunityHub Liberia.

---

## 1. System Architecture

The application is engineered as a fully consolidated full-stack web application hosted on **Google Cloud Run** or **Docker-capable container runtimes**:
- **Frontend Layer**: React 19 SPA served through Vite static asset compilation.
- **Backend Service**: Express Node.js process serving secure API routes (`/api/*`), handling Gemini server-side AI requests, and webhook processing.
- **Reverse Proxy / Server Ingress**: Handled via Nginx or Cloud Run native proxy routing external traffic to port `3000`.

---

## 2. Production Environment Variables

Ensure all required production keys are declared inside your secret vault (e.g. Google Cloud Secret Manager) rather than committed directly as files.

### Server Secrets (.env.production)
```env
# Server Ingress Ports
PORT=3000
NODE_ENV=production

# Core API Security
SESSION_EXPIRY_DAYS=7
ENCRYPTION_SECRET=your_32_byte_hexadecimal_secret_key

# External Service Integrations
GEMINI_API_KEY=your_production_google_gemini_api_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_signing_secret

# Notification Services (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_or_resend_api_key
DEFAULT_FROM_EMAIL=no-reply@opportunityhubliberia.com
```

### Client Environments (.env.production - Exposed to Client via Vite build)
```env
VITE_APP_URL=https://opportunityhubliberia.com
```

---

## 2a. Supabase Environment Variable Contract

As of this phase, the Supabase backend (`supabase/migrations/`) has been reviewed,
restructured into CLI-managed migrations, and is ready to apply — see Section 6.
The application code does **not** read from it yet (that's Phase 3); this contract
governs how the three Supabase variables must be used once it does.

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
`main`: type check → tests → production build → `npm run check:no-service-key-leak`
(fails the build if `SUPABASE_SERVICE_ROLE_KEY` or a service-role client ever shows
up in the client bundle — see Section 2a). Deployment itself is a separate step;
create a workflow file in your repository at `.github/workflows/deploy.yml` to
orchestrate containerization and deployment on top of that.

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

**Status as of this phase**: migrations are written, reviewed, and apply cleanly
in isolation (validated by review — see the header comments in
`supabase/migrations/20260907203348_init_schema.sql` — since this sandbox has no
network route to `*.supabase.co`). They have **not yet been pushed to a live
project**; `npx supabase db push` and the verification script above still need to
be run against real project credentials. See `docs/PRODUCTION_CERTIFICATION_REPORT.md`
→ "Database Status" for the exact, current state.
