# OpportunityHub Liberia — Identity & Organizations Architecture

## 1. Person & User Account Model
* A person has **ONE real account** (`auth.users.id` linked to `public.users.id`).
* An account may have:
  * Personal profile and capabilities (Job seeker, Buyer, Service Provider, Business Seller)
  * One or more organization memberships
  * Distinct organization roles per workspace

## 2. Organization Workspaces
* Organizations represent separate enterprise workspaces (Private Companies, NGOs, Government Institutions, Recruitment Agencies, Small Businesses).
* **Organization Switching**: Allows a user belonging to multiple organizations to switch their active workspace context without altering their core authenticated identity or credentials.
