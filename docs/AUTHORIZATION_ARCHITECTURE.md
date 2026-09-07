# OpportunityHub Liberia — Authorization & RBAC Architecture

## 1. Core Authorization Model
Authorization is governed by the evaluation of:
* **Authenticated User Identity**
* **Organization Membership** (active relationship with a tenant workspace)
* **Organization Role** (`owner`, `admin`, `recruiter`, `hiring_manager`, `member`)
* **Global Platform Role** (`platform_admin`, `verifier`, `moderator`, `user`)
* **Resource Ownership**
* **Subscription Entitlement**
* **Requested Action**

## 2. Least Privilege Principle
* **Deny by Default**: All operations require explicit positive authorization.
* **Backend Enforcement**: Frontend permission checks (`can()`) are strictly auxiliary UX aids. The backend database and RLS policies enforce final authorization on all API routes and data mutations.
* **Separation of Concerns**: Global platform administrative privileges (`platform_admin`) are strictly separate from organization-specific administrative roles (`organization_admin`).
