-- ============================================================================
-- Super Admin: staff account directory.
--
-- Password management needs one row per staff login (name + role + the auth
-- email behind it). `staff_users` has no email column, and auth.users is not
-- exposed to PostgREST, so this SECURITY DEFINER function returns the joined
-- list — active staff only, Super Admin / owner only.
--
-- The password change itself goes through the service-role API route
-- (app/api/admin/staff-users/route.ts), never through the browser.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================================

create or replace function public.admin_staff_accounts()
returns table (
  id uuid,
  name text,
  role text,
  is_active boolean,
  email text,
  last_seen timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.name::text,
    s.role::text,
    s.is_active,
    u.email::text,
    u.last_sign_in_at,
    u.created_at
  from staff_users s
  left join auth.users u on u.id = s.id
  where exists (
    select 1
      from staff_users me
     where me.id = auth.uid()
       and me.is_active = true
       and me.role in ('super_admin', 'owner')
  )
  order by u.created_at nulls last, s.name;
$$;

grant execute on function public.admin_staff_accounts() to authenticated;

-- Lock the search_path-dependent surface: no direct table access added here.
revoke all on function public.admin_staff_accounts() from anon;

notify pgrst, 'reload schema';
