begin;

create or replace function public.provision_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_name text;
  account_phone text;
begin
  account_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'New user'
  );
  account_phone := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');

  insert into public.profiles (id, full_name, email)
  values (new.id, account_name, coalesce(new.email, ''))
  on conflict (id) do nothing;

  if new.raw_user_meta_data ->> 'account_type' = 'customer' then
    insert into public.customers (name, type, contact, email, phone, user_id)
    select account_name, 'B2C', account_phone, coalesce(new.email, ''), account_phone, new.id
    where not exists (
      select 1 from public.customers where user_id = new.id
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

commit;