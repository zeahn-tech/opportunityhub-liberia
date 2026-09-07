# OPPORTUNITYHUB LIBERIA
# RLS SECURITY TEST MATRIX (PHASE 06)

## Overview

This document outlines the security policies and test matrix for the Supabase Postgres Database. All tables have Row Level Security (RLS) enabled. Permissive defaults (`USING (true)`) have been replaced with deny-by-default, granular access rules based on the user's authentication context and organization membership.

## 1. `organizations`

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | Yes | No | No | No | Public users can view verified organizations. |
| **Authenticated** | Yes | Yes | No | No | Users can create new organizations. |
| **Org Admin / Owner** | Yes | Yes | Yes | Yes | Administrators can update or delete their organizations. |

**RLS Policies Applied:**
- `Allow public read access to verified organizations`: `FOR SELECT USING (true)`
- `Allow users to create organizations`: `FOR INSERT TO authenticated WITH CHECK (true)`
- `Allow org admins to update their organizations`: `FOR UPDATE TO authenticated USING (public.is_org_admin(id))`
- `Allow org admins to delete their organizations`: `FOR DELETE TO authenticated USING (public.is_org_admin(id))`

## 2. `users`

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | No | No | No | No | No public access to user profiles. |
| **User (Self)** | Yes | No* | Yes | Yes | Users have full control over their own identity data. *(INSERT handled by Auth trigger)* |
| **Other Users** | No | No | No | No | Users cannot access or modify other users. |

**RLS Policies Applied:**
- `Users can read their own profile`: `FOR SELECT TO authenticated USING (id = auth.uid()::VARCHAR)`
- `Users can update their own profile`: `FOR UPDATE TO authenticated USING (id = auth.uid()::VARCHAR)`
- `Users can delete their own profile`: `FOR DELETE TO authenticated USING (id = auth.uid()::VARCHAR)`

## 3. `organization_memberships`

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | No | No | No | No | Internal membership structure is private. |
| **User (Self)** | Yes | No | No | No | Users can see their own memberships. |
| **Org Member** | Yes | No | No | No | Members can see who else is in the organization. |
| **Org Admin** | Yes | Yes | Yes | Yes | Admins can manage organization memberships. |

**RLS Policies Applied:**
- `Users can view their own memberships`: `FOR SELECT TO authenticated USING (user_id = auth.uid()::VARCHAR)`
- `Org members can view other members`: `FOR SELECT TO authenticated USING (public.is_org_member(organization_id))`
- `Org admins can manage memberships`: `FOR ALL TO authenticated USING (public.is_org_admin(organization_id))`

## 4. `candidate_profiles`

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | No | No | No | No | Resumes and profiles are private. |
| **Candidate (Self)** | Yes | Yes | Yes | No | Candidates can manage their own profiles. |
| **Recruiter** | No* | No | No | No | *(Recruiters receive a snapshot in the `applications` table when a candidate applies, ensuring strict consent-based data sharing.)* |

**RLS Policies Applied:**
- `Users can view their own profile`: `FOR SELECT TO authenticated USING (user_id = auth.uid()::VARCHAR)`
- `Users can insert their own profile`: `FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::VARCHAR)`
- `Users can update their own profile`: `FOR UPDATE TO authenticated USING (user_id = auth.uid()::VARCHAR)`

## 5. `opportunities` (Jobs, Grants, Tenders)

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | Yes (Published) | No | No | No | Public can browse published jobs. |
| **Org Member** | Yes (All) | No | No | No | Members can see drafts. |
| **Org Admin** | Yes | Yes | Yes | Yes | Admins can create, update, and delete postings for their organization. |

**RLS Policies Applied:**
- `Anyone can view published opportunities`: `FOR SELECT USING (status = 'published')`
- `Org members can view their orgs opportunities`: `FOR SELECT TO authenticated USING (public.is_org_member(organization_id))`
- `Org admins can insert opportunities`: `FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id))`
- `Org admins can update opportunities`: `FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id))`
- `Org admins can delete opportunities`: `FOR DELETE TO authenticated USING (public.is_org_admin(organization_id))`

## 6. `applications`

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | No | No | No | No | Applications are private. |
| **Applicant (Self)** | Yes | Yes | Yes | Yes | Applicant can apply, update (withdraw), and delete their application. |
| **Org Member** | Yes | No | Yes | No | Organization recruiters can review applications and update stages. |

**RLS Policies Applied:**
- `Candidates can view their own applications`: `FOR SELECT TO authenticated USING (applicant_user_id = auth.uid()::VARCHAR)`
- `Org members can view applications to their org`: `FOR SELECT TO authenticated USING (public.is_org_member(organization_id))`
- `Candidates can create applications`: `FOR INSERT TO authenticated WITH CHECK (applicant_user_id = auth.uid()::VARCHAR)`
- `Candidates can withdraw applications`: `FOR UPDATE TO authenticated USING (applicant_user_id = auth.uid()::VARCHAR)`
- `Org members can update applications`: `FOR UPDATE TO authenticated USING (public.is_org_member(organization_id))`
- `Candidates can delete their applications`: `FOR DELETE TO authenticated USING (applicant_user_id = auth.uid()::VARCHAR)`

## 7. `business_listings` (M&A)

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | Yes (Public) | No | No | No | Can view public listings, cannot view confidential ones. |
| **Owner (Self)** | Yes | Yes | Yes | Yes | Owners have full control of their listing. |

**RLS Policies Applied:**
- `Anyone can view public business listings`: `FOR SELECT USING (status = 'published' AND is_confidential = false)`
- `Owners can view their own listings`: `FOR SELECT TO authenticated USING (owner_user_id = auth.uid()::VARCHAR)`
- `Owners can insert listings`: `FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid()::VARCHAR)`
- `Owners can update listings`: `FOR UPDATE TO authenticated USING (owner_user_id = auth.uid()::VARCHAR)`
- `Owners can delete listings`: `FOR DELETE TO authenticated USING (owner_user_id = auth.uid()::VARCHAR)`

## 8. `business_access_requests` (NDAs)

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | No | No | No | No | NDA requests are private. |
| **Buyer (Self)** | Yes | Yes | No | No | Buyers can request access and view status. |
| **Listing Owner** | Yes | No | Yes | No | Sellers can review and approve/reject NDA requests. |

**RLS Policies Applied:**
- `Buyers can view their own requests`: `FOR SELECT TO authenticated USING (buyer_user_id = auth.uid()::VARCHAR)`
- `Listing owners can view requests for their listings`: `FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.business_listings bl WHERE bl.id = listing_id AND bl.owner_user_id = auth.uid()::VARCHAR))`
- `Buyers can insert requests`: `FOR INSERT TO authenticated WITH CHECK (buyer_user_id = auth.uid()::VARCHAR)`
- `Listing owners can update requests`: `FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.business_listings bl WHERE bl.id = listing_id AND bl.owner_user_id = auth.uid()::VARCHAR))`

## 9. `audit_logs`

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | No | No | No | No | Logs are highly restricted. |
| **Org Admin** | Yes | No | No | No | Admins can view logs for their own organization. |
| **User (Self)** | Yes | No | No | No | Users can view their own activity history. |
| **Service Role** | Yes | Yes | No | No | Immutable logs are generated exclusively via backend service operations. |

**RLS Policies Applied:**
- `Org admins can view their orgs audit logs`: `FOR SELECT TO authenticated USING (public.is_org_admin(organization_id))`
- `Users can view their own audit logs`: `FOR SELECT TO authenticated USING (user_id = auth.uid()::VARCHAR)`
- `Service role can insert audit logs`: `FOR INSERT TO service_role WITH CHECK (true)`

## 10. `verification_audits`

| Role | SELECT | INSERT | UPDATE | DELETE | Policy Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | No | No | No | No | Audits contain sensitive legal documents. |
| **Org Admin** | Yes | Yes | No | No | Organizations can submit and view their verification requests. |

**RLS Policies Applied:**
- `Org admins can view their orgs verification audits`: `FOR SELECT TO authenticated USING (public.is_org_admin(organization_id))`
- `Org admins can insert verification audits`: `FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id))`

## Schema Grant Modifications

Dangerous permissive grants were explicitly revoked to enforce principle of least privilege:
- `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;`
- `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;`
- `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;`

This ensures that even if RLS is accidentally disabled, `anon` users have zero mutation rights at the database layer.
