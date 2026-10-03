begin;

create or replace function public.assign_customer_staff(target_customer_id uuid, target_staff_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_profile_id uuid;
begin
  if auth.uid() is null or not auth_has_module('customers') then
    raise exception 'Customer management access required';
  end if;

  select id into staff_profile_id from public.profiles
  where lower(full_name) = lower(trim(target_staff_name)) and status = 'Active'
  limit 1;
  if staff_profile_id is null then raise exception 'Active staff profile not found'; end if;

  update public.customers set assigned_to = staff_profile_id where id = target_customer_id;
  if not found then raise exception 'Customer not found'; end if;
  return staff_profile_id;
end;
$$;

create or replace function public.link_lead_to_customer(target_lead_id uuid, target_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not auth_has_module('customers') then
    raise exception 'Customer management access required';
  end if;
  if not exists (select 1 from public.customers where id = target_customer_id) then
    raise exception 'Customer not found';
  end if;
  update public.leads
  set linked_customer_id = target_customer_id, status = 'Won'
  where id = target_lead_id;
  if not found then raise exception 'Lead not found'; end if;
end;
$$;

revoke all on function public.assign_customer_staff(uuid, text) from public;
revoke all on function public.link_lead_to_customer(uuid, uuid) from public;
grant execute on function public.assign_customer_staff(uuid, text) to authenticated;
grant execute on function public.link_lead_to_customer(uuid, uuid) to authenticated;

commit;