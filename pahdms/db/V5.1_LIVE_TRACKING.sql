-- =====================================================================
-- PAHDMS V5.1 - Employee Live Location Tracking
-- =====================================================================
-- Adds a single-row-per-user "current location" table used by the
-- new Live Tracking page (live-tracking.html). Every protected page
-- pings its own user's location into this table every ~30s
-- (js/common.js -> startLiveLocationTracking); the tracking page
-- polls the table and plots everyone on a map.
--
-- SAME CAVEAT AS V5.1_RLS_POLICIES.sql: the policies below rely on
-- auth.uid(), which is only populated for sessions that went through
-- real Supabase Auth (db.auth.signInWithPassword). Legacy
-- (RPC-password) sessions have no JWT, so until every account is
-- migrated (see V5.1_RLS_POLICIES.sql), those sessions will be
-- blocked by RLS from writing/reading this table too. Apply
-- V5.1_RLS_POLICIES.sql's migration steps first if you haven't.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table: one row per user, overwritten on every ping (no history)
-- ---------------------------------------------------------------------
create table if not exists public.user_locations (
    user_id           uuid primary key references public.users(id) on delete cascade,
    full_name         text,
    role              text,
    institution_id    uuid references public.institutions(id),
    institution_name  text,
    latitude          double precision not null,
    longitude         double precision not null,
    accuracy          double precision,
    updated_at        timestamptz not null default now()
);

create index if not exists user_locations_updated_at_idx
    on public.user_locations (updated_at desc);

-- ---------------------------------------------------------------------
-- 2. Row Level Security
--    NOTE: this app's accounts are still on the legacy login path
--    (username/password checked via RPC — see login.js), which never
--    establishes a real Supabase Auth session. That means auth.uid()
--    is NULL for every request the app makes today, so per-user
--    ownership checks (current_app_user()) can't work yet — they'll
--    reject everything with a 403, exactly like you saw.
--
--    Until every account is migrated to real Supabase Auth (see the
--    rollout steps at the top of V5.1_RLS_POLICIES.sql), this table
--    uses the SAME trust model as the rest of the app: open to anyone
--    holding the anon/publishable key, with the actual "who can see
--    what" boundary enforced in the app's UI (requireRole()) rather
--    than the database. Once migrated, tighten this back to
--    per-user writes keyed off current_app_user().
-- ---------------------------------------------------------------------
alter table public.user_locations enable row level security;

drop policy if exists "user_locations_select_authenticated" on public.user_locations;
drop policy if exists "user_locations_select_anyone" on public.user_locations;
create policy "user_locations_select_anyone"
    on public.user_locations
    for select
    using (true);

drop policy if exists "user_locations_upsert_own_row" on public.user_locations;
drop policy if exists "user_locations_insert_anyone" on public.user_locations;
create policy "user_locations_insert_anyone"
    on public.user_locations
    for insert
    with check (true);

drop policy if exists "user_locations_update_own_row" on public.user_locations;
drop policy if exists "user_locations_update_anyone" on public.user_locations;
create policy "user_locations_update_anyone"
    on public.user_locations
    for update
    using (true)
    with check (true);

drop policy if exists "user_locations_delete_own_row" on public.user_locations;
drop policy if exists "user_locations_delete_anyone" on public.user_locations;
create policy "user_locations_delete_anyone"
    on public.user_locations
    for delete
    using (true);

-- ---------------------------------------------------------------------
-- 3. Optional housekeeping: drop stale rows (e.g. run on a schedule)
--    so someone who hasn't opened the app in days doesn't linger on
--    the map forever. The tracking page also greys out anything
--    older than 10 minutes, so this is just table hygiene.
-- ---------------------------------------------------------------------
-- delete from public.user_locations where updated_at < now() - interval '7 days';
