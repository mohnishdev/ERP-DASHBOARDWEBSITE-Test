begin;

revoke update (status) on public.profiles from authenticated;

create or replace function public.admin_set_profile_role(target_profile_id uuid, target_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not auth_has_module('admin') then
    raise exception 'Admin access required';
  end if;

  update public.profiles
  set role_id = target_role_id
  where id = target_profile_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.admin_set_profile_role(uuid, uuid) from public;
grant execute on function public.admin_set_profile_role(uuid, uuid) to authenticated;

create or replace function public.admin_set_profile_status(target_profile_id uuid, target_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not auth_has_module('admin') then
    raise exception 'Admin access required';
  end if;
  if target_status not in ('Active','Suspended') then
    raise exception 'Invalid profile status';
  end if;

  update public.profiles set status = target_status where id = target_profile_id;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

revoke all on function public.admin_set_profile_status(uuid, text) from public;
grant execute on function public.admin_set_profile_status(uuid, text) to authenticated;

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
  change_description text;
begin
  select coalesce(full_name, email, 'System') into actor
  from public.profiles where id = auth.uid();
  actor := coalesce(actor, 'System');

  if tg_table_name = 'roles' then
    change_description := 'Updated access for role ' || coalesce(new.name, old.name);
  elsif tg_table_name = 'profiles' then
    change_description := 'Updated staff profile ' || coalesce(new.email, old.email);
  elsif tg_table_name = 'announcements' then
    change_description := case when tg_op = 'DELETE' then 'Removed announcement ' || old.title else 'Posted announcement ' || new.title end;
  else
    change_description := 'Updated ' || tg_table_name;
  end if;

  insert into public.audit_log (actor_id, actor_name, action)
  values (auth.uid(), actor, change_description);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_roles_change on public.roles;
create trigger audit_roles_change after update on public.roles
  for each row execute function public.audit_admin_change();

drop trigger if exists audit_profiles_admin_change on public.profiles;
create trigger audit_profiles_admin_change after update on public.profiles
  for each row when (old.status is distinct from new.status or old.role_id is distinct from new.role_id)
  execute function public.audit_admin_change();

drop trigger if exists audit_announcements_change on public.announcements;
create trigger audit_announcements_change after insert or update or delete on public.announcements
  for each row execute function public.audit_admin_change();

commit;