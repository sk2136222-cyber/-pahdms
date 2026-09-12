# PAHDMS — Punjab Animal Husbandry Management System (V5.1)

A browser-based management system for institutions, employees, and monthly
reports, backed by Supabase. This package is ready to run locally or to
deploy to any static web host.

## Quick start (local)

Modern browsers block some page scripts when an HTML file is opened
directly (`file://`), so run the app through a tiny local web server —
one command, no install required if you already have Python or Node.

**Windows:** double-click `start.bat`
**macOS / Linux:** double-click `start.sh`, or run `./start.sh` in a terminal

Either script starts a local server at `http://localhost:8000` and opens
`login.html` in your default browser. Stop the server anytime with
`Ctrl+C` in the terminal window it opened.

If you'd rather do it manually:
```bash
# from inside this folder
python3 -m http.server 8000
# or
npx serve -l 8000 .
```
then open `http://localhost:8000/login.html`.

## Deploying

This is a static site (HTML/CSS/JS) — no build step. Upload the contents
of this folder as-is to any static host (Netlify, Vercel, GitHub Pages,
S3 + CloudFront, an internal IIS/Apache/Nginx server, etc.) and point it
at `login.html`.

The app connects to a Supabase project configured in `js/supabase.js`.

## App structure

| Page | Purpose |
|---|---|
| `login.html` | Sign in |
| `dashboard.html` | KPI overview and quick links |
| `institution.html` | Institution records |
| `employee_new.html` | Employee records |
| `monthly-report.html` / `monthly-report-entry.html` | Monthly report list and data-entry form |
| `reports.html` | Reports view |
| `live-tracking.html` | Live map of employees currently using the system (Admin/Block Officer only) |
| `settings.html` | Application/profile settings |
| `user-management.html` | User accounts (Admin only) |

| Folder | Contents |
|---|---|
| `css/` | Stylesheets, one per page area |
| `js/` | Page logic + `common.js` (session/auth helpers) + `supabase.js` (DB client) |
| `db/` | `V5.1_RLS_POLICIES.sql` — Postgres Row-Level-Security policies for Supabase; `V5.1_LIVE_TRACKING.sql` — table + policies for the Live Tracking page |

## Employee Live Tracking

`live-tracking.html` shows a map of everyone currently using the app.
While any protected page is open, `js/common.js` pings the browser's
device location into a `user_locations` table every 30 seconds; the
tracking page polls that table every 15 seconds and plots each person
as a marker (green = active in the last 5 minutes, grey = offline).

Before this works against a real Supabase project, run
**`db/V5.1_LIVE_TRACKING.sql`** once to create the `user_locations`
table and its policies. It depends on the `current_app_user()` helper
from `V5.1_RLS_POLICIES.sql`, so apply that file first if you haven't.
Location sharing only happens while a user has a tab of the app open
and has granted the browser's location permission — there's no
background/native tracking.


## Before going to production

This build is functionally complete and ready to run, but two documents
included in this package flag hardening work that should happen before
it's used with real data:

- **`V5.1_PRODUCTION_CHECKLIST.md`** — outstanding items (e.g. migrating
  login to Supabase Auth, applying the RLS policies in `db/`, DB-level
  constraints).
- **`V5.1_SECURITY_NOTES.md`** — what's already been hardened client-side
  and what still relies on the database layer for real enforcement.

In short: the client-side role checks in `js/common.js` are a UX
convenience, not a security boundary. The SQL policies in `db/` need to
be applied in your Supabase project so the database itself enforces who
can read/write what.
