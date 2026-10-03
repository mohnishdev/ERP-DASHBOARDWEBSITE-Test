begin;

create or replace function public.list_crm_assignable_staff()
returns table(profile_id uuid, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not auth_has_module('crm') then
    raise exception 'CRM access required';
  end if;

  return query
  select p.id, p.full_name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.status = 'Active' and 'crm' = any(r.permitted_modules)
  order by p.full_name;
end;
$$;

revoke all on function public.list_crm_assignable_staff() from public;
grant execute on function public.list_crm_assignable_staff() to authenticated;

commit;