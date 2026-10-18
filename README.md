# Relay CRM — Unified Business Management Platform

> Built for the National University Hackathon.  
> Designed specifically for service businesses with 5–30 employees.

Relay CRM eliminates missed leads by enforcing single accountable ownership, round-robin availability dispatching, PostgreSQL-backed response deadlines, and multi-tier escalation recovery.

---

## Architecture Overview

- **Framework**: Next.js 16 (App Router with Turbopack, React 19, TypeScript)
- **Styling & Design System**: Tailwind CSS v4, Radix UI foundations, Geist Sans typography
- **Color Palette**: Forest Green (`#1E3A2F`), Sage (`#E8EFE9`, `#3D6452`), Charcoal text, 1px subtle borders (`#E5E5E0`)
- **Database & Auth**: Supabase PostgreSQL with strict multi-tenant Row Level Security (RLS)
- **Concurrency & Deadlines**: PostgreSQL `FOR UPDATE` row-locking functions (`assign_lead_atomic`, `escalate_lead_atomic`)
- **Audit & Compliance**: Strictly append-only `audit_events` with disallowed `UPDATE` / `DELETE`

---

## Team Collaboration & Boundaries

- **Teammate Zone (Public Landing Page)**:  
  Teammates independently own `src/app/page.tsx` and public assets. Do not overwrite or modify their landing files.
- **Application Core**:  
  Runs in isolated route groups:
  - `src/app/(auth)/login` & `src/app/(auth)/signup`: Workspace creation & authentication
  - `src/app/(dashboard)/*`: Operational Dashboard, Leads Queue, Recovery SLA, CRM, Communications, Payments, Calendar, Team, Integrations, Audit, and Settings.

---

## Database Architecture & Migrations

All migrations are located in `supabase/migrations/`:
1. `001_initial_schema.sql` (28 domain entities, constraints, foreign keys, indexes)
2. `002_rls_policies.sql` (Multi-tenant isolation policies and role permissions)
3. `003_atomic_functions.sql` (Race-condition-free lead assignment, escalation, auth trigger)

A consolidated migration script is available at `supabase/schema.sql`.

### Applying Migrations to Supabase:
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Paste the contents of `supabase/schema.sql` and click **Run**.

---

## Local Setup & Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase project credentials

# 3. Run development server
npm run dev

# 4. Or build and test production bundle
npm run build
npm run start
```

---

## Verification & Test Results

- **TypeScript Compilation**: `0 errors`
- **Turbopack Production Build**: `Passed` (18 routes compiled in 5.3s)
- **User Flow Verified via Automated Browser Agent**:
  - Landing page navigation
  - Signup with new company workspace creation
  - Automated Owner role assignment
  - Protected Dashboard session persistence
  - Leads Queue placeholder navigation
  - Sign out redirect to `/login`
