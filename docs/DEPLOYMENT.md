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

Create a workflow file in your repository at `.github/workflows/deploy.yml` to orchestrate automatic compilation, testing, containerization, and deployment.

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
