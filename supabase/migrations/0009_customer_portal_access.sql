begin;

alter table public.customers
  add column if not exists address text,
  add column if not exists linkedin text;

create unique index if not exists customers_user_id_unique_idx
  on public.customers(user_id) where user_id is not null;

revoke update on public.customers from anon, authenticated;
grant update (name, contact, email, phone, address, linkedin, type, credit_limit, balance, status, client_since, assigned_to, user_id, avatar_url, logo_url, timezone, support_phone, currency, tax_rate) on public.customers to authenticated;

create or replace function public.guard_customer_profile_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is not null and not auth_has_module('customers') then
    if (to_jsonb(new) - array['name','contact','email','phone','address','linkedin'])
       is distinct from (to_jsonb(old) - array['name','contact','email','phone','address','linkedin']) then
      raise exception 'Customers may only update profile contact fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_customer_profile_update on public.customers;
create trigger guard_customer_profile_update
  before update on public.customers
  for each row execute function public.guard_customer_profile_update();

create or replace function public.assign_customer_booking_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_customer public.customers%rowtype;
begin
  if auth.uid() is not null and not auth_has_module('shipments') and not auth_is_driver() then
    select * into owned_customer from public.customers where user_id = auth.uid();
    if not found then
      raise exception 'Customer profile required before booking';
    end if;
    new.user_id := auth.uid();
    new.customer_id := owned_customer.id;
    new.customer_name := owned_customer.name;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_customer_booking_owner on public.bookings;
create trigger assign_customer_booking_owner
  before insert on public.bookings
  for each row execute function public.assign_customer_booking_owner();

drop policy if exists bookings_staff_or_owner on public.bookings;
create policy bookings_staff_manage on public.bookings for all
  using (auth_has_module('shipments') and not auth_is_driver())
  with check (auth_has_module('shipments') and not auth_is_driver());
create policy bookings_customer_read on public.bookings for select
  using (user_id = auth.uid());
create policy bookings_customer_insert on public.bookings for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()
  ));

create policy invoices_customer_read on public.invoices for select
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()));
create policy invoice_items_customer_read on public.invoice_items for select
  using (exists (
    select 1 from public.invoices i join public.customers c on c.id = i.customer_id
    where i.id = invoice_id and c.user_id = auth.uid()
  ));
create policy tracking_events_customer_read on public.tracking_events for select
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));

drop policy if exists live_chat_messages_support_or_owner on public.live_chat_messages;
create policy live_chat_messages_support_manage on public.live_chat_messages for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy live_chat_messages_customer_read on public.live_chat_messages for select
  using (exists (select 1 from public.live_chats c where c.id = chat_id and c.user_id = auth.uid()));
create policy live_chat_messages_customer_insert on public.live_chat_messages for insert
  with check (sender = 'customer' and exists (select 1 from public.live_chats c where c.id = chat_id and c.user_id = auth.uid()));

commit;