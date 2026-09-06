# OpportunityHub Liberia — Operations Manual

This guide describes operational workflows, diagnostics, maintenance, and moderation strategies for OpportunityHub Liberia.

---

## 1. Monitoring & Diagnostics

Our application operates on consolidated, standardized logging adapters, allowing server administrators to debug and analyze system states:

### Log Inspection
- Platform logs are printed to standard output (`stdout`) as structured JSON lines.
- **Log Levels**: Standard levels `[INFO]`, `[DEBUG]`, `[WARN]`, `[ERROR]`, and `[SECURITY]` categorize all application events.
- **Diagnostics Command (Docker Containers)**:
  ```bash
  # View active logs
  docker logs --tail 100 -f opphub-container
  ```

### Auditing
- Events such as verification submissions, user suspensions, and application stages automatically populate the database audit logs.
- Sensitive user inputs (passwords, auth tokens, API keys) are **automatically redacted** with `[REDACTED]` prior to logging.

---

## 2. Moderation & Sanction Workflows

Administrative and moderating officers utilize the built-in **Trust & Safety Center** to action community reports and security anomalies:

### Review Queues
1. **Evidence Dossier Verification**: Validate statutory documentation (LBR Certificate, LRA Tax Clearance, MOFA accreditation) uploaded by organizations. Issue `verified_company` or `verified_government` badges upon validation.
2. **Postings Quarantine**: Flag or quarantine listings that violate terms of use, such as charging candidates application or agency fees.
3. **Conduct Warnings & Account Restrictions**: Enforce target account sanctions directly:
   - `posting_disabled`: Disables job creation.
   - `messaging_disabled`: Blocks active thread communication.
   - `applications_disabled`: Suspends resume submissions.
   - `full_suspension`: Prevents user logins and revokes all active session tokens instantly.

---

## 3. Database Maintenance & Backup Plans

### Relational Seed Re-Initializations
To reset or re-seed the storage adapter state during staging or administrative maintenance:
```typescript
import { db } from './src/db/dbClient';
db.resetToDefaultSeedData();
```

### Backups Configuration
- **Browser State (Local Storage)**: Since browser configurations are mirrored locally, backups are retained natively on user clients.
- **Container Deployments**: If deployed to persistent databases (e.g., Firestore or Cloud SQL), configure cron schedules to take automated snapshots every 24 hours with a 30-day retention pool.

---

## 4. Key Rotation & SSL Management

### SSL Expirations
- Native Cloud Run deployments handle Let's Encrypt certificate renewals automatically.
- For external Nginx ingress models, ensure certbot is scheduled as a background system cron job.

### Rotating Session Secrets
To rotate the application's session token secret keys:
1. Generate a new cryptographically strong 32-byte hexadecimal secret key.
2. Update the `ENCRYPTION_SECRET` environment key in your cloud platform.
3. Restart the container cluster. (This will gracefully terminate current user sessions, forcing users to re-login with newly signed session tokens).
