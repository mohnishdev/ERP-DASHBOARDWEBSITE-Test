begin;

create or replace function public.auth_permitted_modules()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select r.permitted_modules
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
  ), '{}'::text[]);
$$;

create or replace function public.auth_has_module(module_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(module_key = any(public.auth_permitted_modules()), false);
$$;

commit;