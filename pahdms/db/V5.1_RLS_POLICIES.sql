-- =====================================================================
-- PAHDMS V5.1 - Row Level Security & Login Hardening
-- =====================================================================
-- READ THIS FIRST
-- ---------------------------------------------------------------------
-- RLS policies below are written against auth.uid() / auth.jwt(), i.e.
-- they only take effect once every session is a real Supabase Auth
-- session. As long as login.js keeps comparing users.password directly
-- in the browser for "legacy" accounts, those sessions carry NO
-- Supabase Auth JWT, so RLS will correctly (and unavoidably) block them
-- from everything except the login RPC below.
--
-- Recommended rollout order:
--   1. Run this file (it is safe to run before migration: legacy
--      sessions simply lose access to protected tables until you
--      finish migrating them to Supabase Auth).
--   2. Migrate each user in `users` to a real Supabase Auth account
--      (auth.users), storing the mapping in users.auth_user_id.
--   3. Switch login.js to call db.auth.signInWithPassword() for every
--      account (remove the legacy branch entirely).
--   4. Drop the users.password column.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Schema prerequisite: link app users to Supabase Auth identities
-- ---------------------------------------------------------------------
alter table public.users
    add column if not exists auth_user_id uuid references auth.users(id);

create unique index if not exists users_auth_user_id_key
    on public.users (auth_user_id);

-- ---------------------------------------------------------------------
-- 1. Helper: resolve the calling request to an app user row
-- ---------------------------------------------------------------------
create or replace function public.current_app_user()
returns public.users
language sql
stable
security definer
set search_path = public
as $$
    select u.*
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
    limit 1;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role from public.current_app_user();
$$;

-- ---------------------------------------------------------------------
-- 2a. Account type lookup (so login.js knows which flow to use
--     without ever selecting the users table / password column)
-- ---------------------------------------------------------------------
create or replace function public.get_account_type(p_username text)
returns table (
    is_active boolean,
    is_migrated boolean
)
language sql
security definer
set search_path = public
as $$
    select u.active, (u.password = 'MIGRATED_TO_SUPABASE_AUTH')
    from public.users u
    where u.username = p_username
    limit 1;
$$;

revoke all on function public.get_account_type(text) from public;
grant execute on function public.get_account_type(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2b. Hardened login RPC (interim, for legacy password accounts only)
-- ---------------------------------------------------------------------
-- Replaces the direct `db.from("users").select("*")...eq("password",...)`
-- pattern in login.js. Anon key can call this RPC but can no longer
-- SELECT the users table directly (see policies below), so passwords
-- are never returned to the browser and can't be bulk-scraped.
-- Still only as strong as plaintext-password comparison allows --
-- treat this as a bridge, not an endpoint, until step 3 above is done.
create or replace function public.login_with_password(
    p_username text,
    p_password text
)
returns table (
    id uuid,
    full_name text,
    username text,
    role text,
    institution_id uuid,
    institution_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    select u.id, u.full_name, u.username, u.role, u.institution_id,
           i.institution_name
    from public.users u
    left join public.institutions i on i.id = u.institution_id
    where u.username = p_username
      and u.active = true
      and u.password = p_password
      and u.password <> 'MIGRATED_TO_SUPABASE_AUTH';
end;
$$;

revoke all on function public.login_with_password(text, text) from public;
grant execute on function public.login_with_password(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------
alter table public.institutions      enable row level security;
alter table public.employees         enable row level security;
alter table public.users             enable row level security;
alter table public.mpr_reports       enable row level security;
alter table public.mpr_section_data  enable row level security;

-- ---------------------------------------------------------------------
-- 4. institutions
--    Read: any active authenticated app user.
--    Write: district_admin or block_officer only.
-- ---------------------------------------------------------------------
create policy institutions_select on public.institutions
    for select
    using (public.current_app_role() is not null);

create policy institutions_write on public.institutions
    for all
    using (public.current_app_role() in ('district_admin', 'block_officer'))
    with check (public.current_app_role() in ('district_admin', 'block_officer'));

-- ---------------------------------------------------------------------
-- 5. employees
--    Read: any active authenticated app user.
--    Write: district_admin or block_officer only.
-- ---------------------------------------------------------------------
create policy employees_select on public.employees
    for select
    using (public.current_app_role() is not null);

create policy employees_write on public.employees
    for all
    using (public.current_app_role() in ('district_admin', 'block_officer'))
    with check (public.current_app_role() in ('district_admin', 'block_officer'));

-- ---------------------------------------------------------------------
-- 6. users
--    Read: district_admin sees all rows; everyone else sees only their
--         own row.
--    Write: district_admin or block_officer (matches js/user.js, which
--         lets block_officer create/manage users too, scoped to their
--         own block in the UI — this policy does NOT enforce that block
--         scoping at the DB level, only that the role is one of the two
--         allowed to manage accounts at all. Add a block-column check
--         here if you need the DB to enforce block scoping too).
--    Note: the `password` column should be dropped once migration to
--    Supabase Auth is complete (step 4 in the rollout above); until
--    then it remains readable by district_admin rows returned here,
--    which is an accepted interim exposure limited to admins only, not
--    anon.
-- ---------------------------------------------------------------------
create policy users_select on public.users
    for select
    using (
        public.current_app_role() = 'district_admin'
        or auth_user_id = auth.uid()
    );

create policy users_write on public.users
    for all
    using (public.current_app_role() in ('district_admin', 'block_officer'))
    with check (public.current_app_role() in ('district_admin', 'block_officer'));

-- ---------------------------------------------------------------------
-- 7. mpr_reports
--    Read: any active authenticated app user.
--    Insert: any active authenticated app user (report creation).
--    Update: district_admin/block_officer can change status freely; the reporting
--            institution's own users (VO/VI) may only edit while the
--            report is still in Draft.
--    Delete: district_admin only.
-- ---------------------------------------------------------------------
create policy mpr_reports_select on public.mpr_reports
    for select
    using (public.current_app_role() is not null);

create policy mpr_reports_insert on public.mpr_reports
    for insert
    with check (public.current_app_role() is not null);

create policy mpr_reports_update on public.mpr_reports
    for update
    using (
        public.current_app_role() in ('district_admin', 'block_officer')
        or (
            institution_id = (public.current_app_user()).institution_id
            and status = 'Draft'
        )
    )
    with check (
        public.current_app_role() in ('district_admin', 'block_officer')
        or (
            institution_id = (public.current_app_user()).institution_id
            and status in ('Draft', 'Submitted')
        )
    );

create policy mpr_reports_delete on public.mpr_reports
    for delete
    using (public.current_app_role() = 'district_admin');

-- Unique constraint to close the create-draft race condition
-- (js/monthly-report.js currently relies on a client-side check-then-insert).
alter table public.mpr_reports
    add constraint mpr_reports_unique_institution_period
    unique (institution_id, report_month, report_year);

-- ---------------------------------------------------------------------
-- 8. mpr_section_data
--    Mirrors mpr_reports: readable by any authenticated user, writable
--    by the owning institution while Draft, or by district_admin/block_officer anytime.
-- ---------------------------------------------------------------------
create policy mpr_section_data_select on public.mpr_section_data
    for select
    using (public.current_app_role() is not null);

create policy mpr_section_data_write on public.mpr_section_data
    for all
    using (
        public.current_app_role() in ('district_admin', 'block_officer')
        or exists (
            select 1 from public.mpr_reports r
            where r.id = mpr_section_data.report_id
              and r.institution_id = (public.current_app_user()).institution_id
              and r.status = 'Draft'
        )
    )
    with check (
        public.current_app_role() in ('district_admin', 'block_officer')
        or exists (
            select 1 from public.mpr_reports r
            where r.id = mpr_section_data.report_id
              and r.institution_id = (public.current_app_user()).institution_id
              and r.status = 'Draft'
        )
    );

-- =====================================================================
-- End of file. Adjust column/table names above if your actual schema
-- differs slightly (e.g. mpr_reports.institution_id nullability,
-- mpr_section_data's report_id foreign key name).
-- =====================================================================
