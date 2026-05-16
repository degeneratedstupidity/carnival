# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Turbopack, port 3000)
npm run build     # TypeScript check + production build
npm run lint      # ESLint
```

## Critical Next.js 16 Breaking Changes

This project uses **Next.js 16.2.6** — read `AGENTS.md` before touching routing or middleware.

- **`middleware.ts` → `proxy.ts`**: Export is named `proxy`, not `middleware`
- **`cookies()`, `headers()` must be awaited**: `const cookieStore = await cookies()`
- **Dynamic route params are async**: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params`
- **`searchParams` in pages is async**: Same pattern as params

## Architecture

**Stack**: Next.js 16 App Router + Supabase (PostgreSQL + Auth + Realtime) + shadcn/ui (Ark UI based, v4)

**Role routing**: Employee → `/employee/*`, Manager → `/manager/*`, Admin → `/admin/*`. Protected by `proxy.ts` which checks Supabase session.

**Demo Mode**: `app/page.tsx` login page has one-click demo buttons. Signs in via `supabase.auth.signInWithPassword` using `[role]@atomflow.demo / Demo@2026!` accounts. `DemoSwitcher` component (bottom-right pill) allows role switching without logout.

**Data pattern**: Server components fetch data with `createClient()` from `lib/supabase/server.ts`. Client mutations use `createClient()` from `lib/supabase/client.ts`. Never use nested Supabase joins in server components — they return arrays, not single objects. Pre-process relational data with `Map` lookups instead.

**shadcn v4 Select quirk**: `onValueChange` passes `string | null`, not just `string`. Always guard: `onValueChange={(v) => v && setState(v)}`.

**Score computation**: All UoM scoring is in `lib/scoring.ts::computeScore()`. Six types: `min_numeric`, `max_numeric`, `min_percent`, `max_percent`, `timeline`, `zero`. Cap at 150%.

**Validation**: `lib/validations.ts` — MAX_GOALS=8, MIN_WEIGHT=10%, TOTAL_WEIGHT=100%.

## Key Files

| Path | Purpose |
|---|---|
| `proxy.ts` | Route protection (Next.js 16 middleware) |
| `lib/supabase/server.ts` | Async Supabase client for server components |
| `lib/scoring.ts` | UoM score computation for all 6 goal types |
| `lib/validations.ts` | Goal set validation rules |
| `supabase/migrations/001_schema.sql` | Full DB schema with RLS |
| `supabase/seed.sql` | Demo seed data (thrust areas, cycles, templates) |
| `components/goals/WeightageFuelGauge.tsx` | Live weightage bar (blue→orange→green→red) |
| `components/goals/ScoreRing.tsx` | Animated SVG progress ring per goal |
| `components/layout/AppShell.tsx` | Sidebar + main layout wrapper |

## Copy Style

No emojis. Plain student English. Examples:
- Buttons: "Submit goals", "Approve", "Return for rework"
- Errors: "Total weightage must equal 100%. Currently at 85%."
- Empty states: "No goals added yet. Click Add goal to get started."

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (Google AI Studio free tier — no billing needed)
- `CRON_SECRET` (any random string)

## AI Coach

`app/api/ai/route.ts` calls Gemini 1.5 Flash. Rate-limited to 1 call per 15s per userId (in-memory Map — resets on cold start, acceptable for demo). Returns 3 bullet improvement suggestions. Falls back to hardcoded suggestions on error.

## Cron Job

`app/api/cron/route.ts` — daily escalation check. Protected by `Authorization: Bearer $CRON_SECRET`. Triggered by Vercel Cron at `0 3 * * *` (8:30am IST). Creates escalation records for submission/approval/check-in delays.
