begin;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.customers
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists avatar_url text,
  add column if not exists logo_url text,
  add column if not exists timezone text,
  add column if not exists support_phone text,
  add column if not exists currency text not null default 'NGN',
  add column if not exists tax_rate numeric(5,2) not null default 7.50;

alter table public.drivers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.bookings
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists driver_id uuid references public.drivers(id) on delete set null,
  add column if not exists sender_name text,
  add column if not exists sender_phone text,
  add column if not exists sender_address text,
  add column if not exists sender_email text,
  add column if not exists receiver_name text,
  add column if not exists receiver_phone text,
  add column if not exists receiver_address text,
  add column if not exists vehicle_number text,
  add column if not exists driver_name text,
  add column if not exists driver_phone text,
  add column if not exists checked_by text,
  add column if not exists dispatched_by text,
  add column if not exists declared_value_customs numeric(14,2) not null default 0,
  add column if not exists insurance_amount numeric(14,2) not null default 0,
  add column if not exists freight_terms text;

alter table public.invoices
  add column if not exists posted boolean not null default false;

alter table public.expenses
  add column if not exists status text not null default 'Paid';

alter table public.purchase_orders
  add column if not exists description text,
  add column if not exists order_date date;

update public.purchase_orders
set description = coalesce(description, items_description),
    order_date = coalesce(order_date, po_date);

alter table public.quotations
  add column if not exists amount numeric(14,2) not null default 0;

alter table public.manifests
  add column if not exists vehicle_number text;

update public.manifests
set vehicle_number = coalesce(vehicle_number, vehicle_plate);

alter table public.returns
  add column if not exists recorded_by text;

alter table public.employees
  add column if not exists votes integer not null default 0,
  add column if not exists offer_heading text,
  add column if not exists offer_letter_url text;

alter table public.leave_requests
  add column if not exists leave_heading text,
  add column if not exists letter_url text;

alter table public.applicants
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists message text;

alter table public.customers drop constraint if exists customers_type_check;
alter table public.customers
  add constraint customers_type_check check (type in ('B2B','B2C','Individual'));

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.clock_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  notes text,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  constraint clock_entries_duration_nonnegative check (duration_minutes is null or duration_minutes >= 0)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sheet_cells (
  row_index integer not null check (row_index >= 0),
  col_index integer not null check (col_index >= 0),
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (row_index, col_index)
);

create table if not exists public.fleet_maintenance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.fleet_vehicles(id) on delete cascade,
  description text not null,
  cost numeric(14,2) not null default 0 check (cost >= 0),
  service_date date not null default current_date,
  status text not null default 'Scheduled',
  raised_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.fleet_insurance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.fleet_vehicles(id) on delete cascade,
  insurer text not null,
  policy_number text not null,
  coverage_type text,
  premium numeric(14,2) not null default 0 check (premium >= 0),
  start_date date,
  expiry_date date,
  created_at timestamptz not null default now(),
  unique (vehicle_id, policy_number)
);

create table if not exists public.career_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  employment_type text,
  description text not null,
  status text not null default 'Open' check (status in ('Open','Closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.booking_cargo_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  gross_weight numeric(12,2),
  unit text,
  rate_class text,
  chargeable_weight numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists public.proof_of_delivery (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  received_by text,
  recorded_by text,
  status text not null default 'Pending',
  delivered_at timestamptz,
  signature_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.live_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text not null default 'Open' check (status in ('Open','Pending','Resolved')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.live_chats(id) on delete cascade,
  sender text not null check (sender in ('customer','agent','system')),
  message text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.support_emails (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users(id) on delete set null,
  direction text not null default 'outbound',
  to_address text not null,
  subject text not null,
  body text not null,
  status text not null default 'Queued',
  read boolean not null default false,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.support_sms (
  id uuid primary key default gen_random_uuid(),
  direction text not null default 'outbound',
  to_number text not null,
  message text not null,
  status text not null default 'Queued',
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.support_calls (
  id uuid primary key default gen_random_uuid(),
  direction text not null default 'outbound',
  number text not null,
  notes text,
  status text not null default 'Logged',
  created_at timestamptz not null default now()
);

create table if not exists public.support_whatsapp (
  id uuid primary key default gen_random_uuid(),
  direction text not null default 'outbound',
  to_number text not null,
  message text not null,
  status text not null default 'Queued',
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_team_members (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text,
  role text not null default 'Member',
  status text not null default 'Invited',
  permitted_modules text[] not null default '{}',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  status_changed_at timestamptz,
  status_changed_by text,
  removed_at timestamptz,
  unique (customer_id, email)
);

create table if not exists public.customer_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  item_name text not null,
  quantity numeric(12,2) not null default 0,
  location text,
  reorder_threshold numeric(12,2) not null default 0,
  details text,
  unit_cost numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, sku)
);

create table if not exists public.customer_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text,
  job_title text,
  email text,
  phone text,
  source text,
  status text not null default 'New',
  priority text not null default 'Warm',
  transport_mode text,
  origin text,
  destination text,
  deal_value numeric(14,2) not null default 0,
  call_back_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.customer_leads(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_own_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_no text not null,
  currency text not null default 'NGN',
  client_name text not null,
  logo_url text,
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  unique (user_id, invoice_no)
);

create table if not exists public.customer_own_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.customer_own_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  updated_at timestamptz not null default now()
);

create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_driver_id_idx on public.bookings(driver_id);
create index if not exists clock_entries_user_clock_in_idx on public.clock_entries(user_id, clock_in desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists booking_cargo_items_booking_idx on public.booking_cargo_items(booking_id);
create index if not exists live_chat_messages_chat_created_idx on public.live_chat_messages(chat_id, created_at);
create index if not exists customer_team_members_customer_idx on public.customer_team_members(customer_id);
create index if not exists customer_leads_user_created_idx on public.customer_leads(user_id, created_at desc);

create or replace function public.auth_owns_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = target_customer_id and c.user_id = auth.uid()
  ) or exists (
    select 1
    from public.customer_team_members m
    where m.customer_id = target_customer_id
      and m.user_id = auth.uid()
      and m.removed_at is null
      and m.status in ('Active','Accepted')
  );
$$;

create or replace function public.auth_owns_customer_account(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = target_customer_id and c.user_id = auth.uid()
  );
$$;

  create or replace function public.auth_is_driver()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1
      from public.profiles p
      join public.roles r on r.id = p.role_id
      where p.id = auth.uid() and r.name = 'Driver'
    );
  $$;

  insert into public.roles (name, description, permitted_modules) values
    ('Super Admin','Full access to all ERP modules.',array['dashboard','crm','customers','shipments','fleet','drivers','warehouse','finance','hr','support','reports','admin']),
    ('Operations Manager','Manages day-to-day logistics operations.',array['dashboard','shipments','fleet','drivers','warehouse']),
    ('Finance Officer','Manages finance and financial reporting.',array['dashboard','finance','reports']),
    ('Customer Service','Manages customer accounts and support.',array['dashboard','crm','customers','support']),
    ('Driver','Views assigned shipments.',array['shipments'])
  on conflict (name) do nothing;

create or replace function public.provision_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New user'),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.provision_profile_for_auth_user();

create or replace function public.accept_staff_invite()
returns void
language plpgsql
  security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.customer_team_members
  set user_id = auth.uid(), status = 'Active', accepted_at = now()
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and user_id is null
    and removed_at is null;
end;
$$;

create or replace function public.increment_employee_votes(employee_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.auth_has_module('hr') then
    raise exception 'HR module access required';
  end if;

  update public.employees set votes = votes + 1 where id = employee_id;
end;
$$;

revoke all on function public.accept_staff_invite() from public, anon;
revoke all on function public.increment_employee_votes(uuid) from public, anon;
revoke all on function public.auth_is_driver() from public, anon;
grant execute on function public.accept_staff_invite() to authenticated;
grant execute on function public.increment_employee_votes(uuid) to authenticated;
grant execute on function public.auth_is_driver() to authenticated;
grant execute on function public.auth_is_driver() to anon;

-- Replace policies that allowed self-service role changes, forged audit entries,
-- or module-wide access to customer-owned data.
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists audit_log_insert_any_authenticated on public.audit_log;
drop policy if exists customers_by_module on public.customers;
drop policy if exists bookings_by_module on public.bookings;
drop policy if exists drivers_by_module on public.drivers;
drop policy if exists tracking_events_by_module on public.tracking_events;
drop policy if exists manifests_by_module on public.manifests;
drop policy if exists manifest_shipments_module on public.manifest_shipments;
drop policy if exists returns_by_module on public.returns;
drop policy if exists tracking_events_staff_or_assigned_driver on public.tracking_events;
drop policy if exists manifests_staff_or_assigned_driver on public.manifests;
drop policy if exists returns_staff_or_assigned_driver on public.returns;
drop policy if exists cargo_items_staff_or_owner on public.booking_cargo_items;
drop policy if exists pod_staff_or_owner on public.proof_of_delivery;
drop policy if exists live_chat_messages_support_or_owner on public.live_chat_messages;
drop policy if exists tickets_by_module on public.tickets;
drop policy if exists chat_threads_by_module on public.chat_threads;
drop policy if exists chat_messages_by_module on public.chat_messages;
drop policy if exists kb_by_module on public.kb_articles;

create policy profiles_self_update_safe on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update_safe on public.profiles for update
  using (auth_has_module('admin')) with check (auth_has_module('admin'));

revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create policy customers_staff_or_owner on public.customers for all
  using (auth_has_module('customers') or user_id = auth.uid())
  with check (auth_has_module('customers') or user_id = auth.uid());
create policy bookings_staff_or_owner on public.bookings for all
  using (
    (auth_has_module('shipments') and not auth_is_driver())
    or (user_id = auth.uid() and not auth_is_driver())
  ) with check (
    (auth_has_module('shipments') and not auth_is_driver())
    or (user_id = auth.uid() and not auth_is_driver())
  );
create policy bookings_assigned_driver_read on public.bookings for select
  using (exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()));
create policy bookings_assigned_driver_update on public.bookings for update
  using (auth_is_driver() and exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()))
  with check (auth_is_driver() and exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()));

create or replace function public.guard_driver_booking_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.auth_is_driver()
     and (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'Drivers may only update shipment status';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_driver_booking_update on public.bookings;
create trigger guard_driver_booking_update
  before update on public.bookings
  for each row execute function public.guard_driver_booking_update();

create policy drivers_self_or_module on public.drivers for all
  using (auth_has_module('drivers') or user_id = auth.uid())
  with check (auth_has_module('drivers') or user_id = auth.uid());
create policy tracking_events_staff_all on public.tracking_events for all
  using (auth_has_module('shipments') and not auth_is_driver())
  with check (auth_has_module('shipments') and not auth_is_driver());
create policy tracking_events_driver_read on public.tracking_events for select
  using (exists (
    select 1 from public.bookings b
    join public.drivers d on d.id = b.driver_id
    where b.id = booking_id and d.user_id = auth.uid()
  ));
create policy tracking_events_driver_insert on public.tracking_events for insert
  with check (auth_is_driver() and exists (
    select 1 from public.bookings b
    join public.drivers d on d.id = b.driver_id
    where b.id = booking_id and d.user_id = auth.uid()
  ));
create policy manifests_staff_all on public.manifests for all
  using (auth_has_module('shipments') and not auth_is_driver())
  with check (auth_has_module('shipments') and not auth_is_driver());
create policy manifests_assigned_driver_read on public.manifests for select
  using (exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()));
create policy manifest_shipments_staff_all on public.manifest_shipments for all
  using (auth_has_module('shipments') and not auth_is_driver())
  with check (auth_has_module('shipments') and not auth_is_driver());
create policy manifest_shipments_assigned_driver_read on public.manifest_shipments for select
  using (exists (
    select 1 from public.manifests m
    join public.drivers d on d.id = m.driver_id
    where m.id = manifest_id and d.user_id = auth.uid()
  ));
create policy returns_staff_all on public.returns for all
  using (auth_has_module('shipments') and not auth_is_driver())
  with check (auth_has_module('shipments') and not auth_is_driver());
create policy returns_assigned_driver_read on public.returns for select
  using (exists (
    select 1 from public.bookings b
    join public.drivers d on d.id = b.driver_id
    where b.id = booking_id and d.user_id = auth.uid()
  ));

create policy tickets_module_access on public.tickets for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy chat_threads_module_access on public.chat_threads for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy chat_messages_module_access on public.chat_messages for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy kb_module_access on public.kb_articles for all
  using (auth_has_module('support')) with check (auth_has_module('support'));

create policy announcements_read_authenticated on public.announcements for select
  using (auth.uid() is not null);
create policy announcements_admin_write on public.announcements for all
  using (auth_has_module('admin')) with check (auth_has_module('admin'));

alter table public.announcements enable row level security;
alter table public.clock_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.sheet_cells enable row level security;
alter table public.fleet_maintenance enable row level security;
alter table public.fleet_insurance enable row level security;
alter table public.career_postings enable row level security;
alter table public.booking_cargo_items enable row level security;
alter table public.proof_of_delivery enable row level security;
alter table public.live_chats enable row level security;
alter table public.live_chat_messages enable row level security;
alter table public.support_emails enable row level security;
alter table public.support_sms enable row level security;
alter table public.support_calls enable row level security;
alter table public.support_whatsapp enable row level security;
alter table public.team_chat_messages enable row level security;
alter table public.customer_team_members enable row level security;
alter table public.customer_inventory enable row level security;
alter table public.customer_leads enable row level security;
alter table public.customer_lead_notes enable row level security;
alter table public.customer_own_invoices enable row level security;
alter table public.customer_own_invoice_items enable row level security;
alter table public.customer_notes enable row level security;

create policy clock_entries_self_or_hr on public.clock_entries for all
  using (user_id = auth.uid() or auth_has_module('hr'))
  with check (user_id = auth.uid() or auth_has_module('hr'));
create policy notifications_self on public.notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sheet_cells_crm on public.sheet_cells for all
  using (auth_has_module('crm')) with check (auth_has_module('crm'));
create policy fleet_maintenance_module on public.fleet_maintenance for all
  using (auth_has_module('fleet')) with check (auth_has_module('fleet'));
create policy fleet_insurance_module on public.fleet_insurance for all
  using (auth_has_module('fleet')) with check (auth_has_module('fleet'));
create policy career_postings_public_read on public.career_postings for select
  using (true);
create policy career_postings_hr_write on public.career_postings for all
  using (auth_has_module('hr')) with check (auth_has_module('hr'));
create policy cargo_items_staff_or_owner on public.booking_cargo_items for all
  using (
    (auth_has_module('shipments') and not auth_is_driver()) or exists (
      select 1 from public.bookings b
      where b.id = booking_id and not auth_is_driver() and (
        b.user_id = auth.uid() or exists (
          select 1 from public.drivers d where d.id = b.driver_id and d.user_id = auth.uid()
        )
      )
    )
  ) with check (
    (auth_has_module('shipments') and not auth_is_driver()) or exists (
      select 1 from public.bookings b
      where b.id = booking_id and not auth_is_driver() and (
        b.user_id = auth.uid() or exists (
          select 1 from public.drivers d where d.id = b.driver_id and d.user_id = auth.uid()
        )
      )
    )
  );
create policy pod_staff_or_owner on public.proof_of_delivery for all
  using (
    (auth_has_module('shipments') and not auth_is_driver()) or exists (
      select 1 from public.bookings b
      where b.id = booking_id and not auth_is_driver() and (
        b.user_id = auth.uid() or exists (
          select 1 from public.drivers d where d.id = b.driver_id and d.user_id = auth.uid()
        )
      )
    )
  ) with check (
    (auth_has_module('shipments') and not auth_is_driver()) or exists (
      select 1 from public.bookings b
      where b.id = booking_id and not auth_is_driver() and (
        b.user_id = auth.uid() or exists (
          select 1 from public.drivers d where d.id = b.driver_id and d.user_id = auth.uid()
        )
      )
    )
  );
create policy live_chats_support_or_owner on public.live_chats for all
  using (auth_has_module('support') or user_id = auth.uid())
  with check (auth_has_module('support') or user_id = auth.uid());
create policy live_chat_messages_support_or_owner on public.live_chat_messages for all
  using (
    auth_has_module('support') or exists (
      select 1 from public.live_chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  ) with check (
    auth_has_module('support') or exists (
      select 1 from public.live_chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );
create policy support_emails_staff_all on public.support_emails for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy support_emails_customer_read on public.support_emails for select
  using (customer_user_id = auth.uid());
create policy support_sms_support on public.support_sms for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy support_calls_support on public.support_calls for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy support_whatsapp_support on public.support_whatsapp for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy team_chat_authenticated on public.team_chat_messages for all
  using (auth_has_module('dashboard') or auth_has_module('admin'))
  with check (auth_has_module('dashboard') or auth_has_module('admin'));
create policy customer_team_members_owner_write on public.customer_team_members for all
  using (auth_has_module('admin') or auth_owns_customer_account(customer_id))
  with check (auth_has_module('admin') or auth_owns_customer_account(customer_id));
create policy customer_team_members_self_read on public.customer_team_members for select
  using (user_id = auth.uid());
create policy customer_inventory_owner on public.customer_inventory for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy customer_leads_owner on public.customer_leads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy customer_lead_notes_owner on public.customer_lead_notes for all
  using (
    exists (select 1 from public.customer_leads l where l.id = lead_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.customer_leads l where l.id = lead_id and l.user_id = auth.uid())
  );
create policy customer_own_invoices_owner on public.customer_own_invoices for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy customer_own_invoice_items_owner on public.customer_own_invoice_items for all
  using (
    exists (select 1 from public.customer_own_invoices i where i.id = invoice_id and i.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.customer_own_invoices i where i.id = invoice_id and i.user_id = auth.uid())
  );
create policy customer_notes_owner on public.customer_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace view public.manifest_bookings
with (security_invoker = true)
as
select manifest_id, booking_id from public.manifest_shipments;

grant select, insert, update, delete on public.manifest_bookings to authenticated;

comment on table public.applicants is
  'Public submissions must be handled by a server endpoint with validation and rate limiting; no anonymous write policy is granted.';
comment on table public.support_emails is
  'Email delivery must be sent by a server-side provider integration after checking the caller role and applying rate limits.';

commit;