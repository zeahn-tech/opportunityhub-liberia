# OpportunityHub Liberia — Row Level Security (RLS) Model

## 1. Security Principles
* **Deny by Default**: Unauthenticated visitors (`anon`) have strictly read-only access to published public listings (opportunities and public business teasers).
* **Tenant Isolation**: Users can only access organization-private records (applications, internal candidate notes, analytics, billing) if they possess an active membership in that organization.
* **Owner Privacy**: Personal profiles and confidential data can only be modified by the resource owner or authorized platform administrators.

## 2. Policy Enforcement
Supabase RLS policies are enforced directly at the PostgreSQL database level using `auth.uid()` and membership lookup functions, preventing unauthorized data access even if client-side code is bypassed.
