-- =====================================================================
-- PAHDMS V5.1 - Financial Year Targets (New OPD & Cattle+Buffalo AI)
-- =====================================================================
-- One row per institution per Financial Year. FY is stored as its
-- start year (e.g. 2026 = FY 2026-27, Apr 2026 - Mar 2027), matching
-- the convention already used for Monthly Report.
--
-- Monthly target = annual target / 12 (the app computes this on the
-- fly; it is not stored separately).
--
-- Same trust-model note as the other V5.1 SQL files: this app's
-- accounts are still on the legacy login path (no real Supabase Auth
-- session), so policies here are open to anyone holding the app's
-- anon key, with the actual "who can set targets for whom" boundary
-- enforced in the UI (requireRole() + block scoping), not the DB.
-- =====================================================================

create table if not exists public.institution_targets (
    id                        uuid primary key default gen_random_uuid(),
    institution_id            uuid not null references public.institutions(id) on delete cascade,
    financial_year_start_year int not null,
    target_new_opd            int not null default 0,
    target_cattle_buffalo_ai  int not null default 0,
    updated_at                timestamptz not null default now(),
    unique (institution_id, financial_year_start_year)
);

create index if not exists institution_targets_fy_idx
    on public.institution_targets (financial_year_start_year);

alter table public.institution_targets enable row level security;

drop policy if exists "institution_targets_select_anyone" on public.institution_targets;
create policy "institution_targets_select_anyone"
    on public.institution_targets
    for select
    using (true);

drop policy if exists "institution_targets_write_anyone" on public.institution_targets;
create policy "institution_targets_write_anyone"
    on public.institution_targets
    for all
    using (true)
    with check (true);
