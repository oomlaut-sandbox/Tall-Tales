-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Lets a signed-in parent delete their own account from inside the app
-- (Apple requires this for any app where people can create an account).
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
