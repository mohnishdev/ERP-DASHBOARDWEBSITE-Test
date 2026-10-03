begin;

create or replace function public.convert_lead_to_customer(target_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_lead public.leads%rowtype;
  created_customer_id uuid;
begin
  if auth.uid() is null or not auth_has_module('crm') then
    raise exception 'CRM access required';
  end if;

  select * into source_lead from public.leads where id = target_lead_id for update;
  if not found then
    raise exception 'Lead not found';
  end if;

  if source_lead.linked_customer_id is not null then
    return source_lead.linked_customer_id;
  end if;

  select id into created_customer_id from public.customers
  where lower(name) = lower(source_lead.company)
  order by created_at desc limit 1;

  if created_customer_id is null then
    insert into public.customers (name, type, contact, email, phone, credit_limit, balance, status, client_since)
    values (
      source_lead.company,
      'B2B',
      concat_ws(', ', source_lead.contact_name, source_lead.phone),
      source_lead.email,
      source_lead.phone,
      greatest(source_lead.value, 500000),
      0,
      'Active',
      to_char(current_date, 'YYYY')
    ) returning id into created_customer_id;
  end if;

  update public.leads
  set linked_customer_id = created_customer_id, status = 'Won'
  where id = source_lead.id;

  return created_customer_id;
end;
$$;

revoke all on function public.convert_lead_to_customer(uuid) from public;
grant execute on function public.convert_lead_to_customer(uuid) to authenticated;

commit;