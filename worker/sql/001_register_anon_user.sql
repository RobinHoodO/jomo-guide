-- Replaces Supabase's auth.users insert + handle_new_user trigger.
-- Run once as the Neon owner role. Only the Worker (role jomo_app) may execute it,
-- and it is NOT exposed through /api/rpc.
create or replace function public.register_anon_user(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into auth.users (id, created_at, last_sign_in_at, is_anonymous)
  values (p_id, now(), now(), true)
  on conflict (id) do update set last_sign_in_at = now();

  insert into public.profiles (id, display_name)
  values (p_id, public.generate_burner_name())
  on conflict (id) do nothing;
end
$$;

revoke all on function public.register_anon_user(uuid) from public;
grant execute on function public.register_anon_user(uuid) to jomo_app;
