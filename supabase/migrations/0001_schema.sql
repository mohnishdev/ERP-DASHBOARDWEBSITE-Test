-- JAAD Logistics ERP — Core schema
-- Target: Supabase (Postgres 15+). Uses auth.users for identity.
-- Run this as the first migration in a fresh Supabase project.

create extension if not exists pgcrypto;

-- ============================================================
-- ROLES & ACCESS
-- ============================================================
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  permitted_modules text[] not null default '{}', -- e.g. {'dashboard','crm','shipments'}
  created_at timestamptz not null default now()
);

-- One row per authenticated user, extending auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role_id uuid references roles(id) on delete set null,
  status text not null default 'Active' check (status in ('Active','Suspended')),
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);

-- Helper: current user's permitted modules, used by RLS policies below.
create or replace function auth_permitted_modules()
returns text[]
language sql stable
security definer
set search_path = public
as $$
  select coalesce(r.permitted_modules, '{}')
  from profiles p
  join roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function auth_has_module(module_key text)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select module_key = any(auth_permitted_modules());
$$;

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'B2B' check (type in ('B2B','B2C')),
  contact text,
  credit_limit numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  status text not null default 'Active' check (status in ('Active','On hold','Inactive')),
  client_since text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CRM & LEADS
-- ============================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text not null,
  job_title text,
  email text,
  phone text not null,
  source text check (source in ('Website','Referral','Cold Call','Social Media','Trade Show','Other')),
  industry text,
  priority text not null default 'Warm' check (priority in ('Hot','Warm','Cold')),
  status text not null default 'New' check (status in ('New','Contacted','Qualified','Proposal Sent','Won','Lost')),
  assigned_to uuid references profiles(id) on delete set null,
  follow_up_date date,
  transport_mode text check (transport_mode in ('Trucks / Haulage','RORO','Sea Freight','Air Freight','Cargo')),
  cargo_type text,
  origin text,
  destination text,
  frequency text check (frequency in ('One-time','Weekly','Monthly','Quarterly','Other')),
  volume_weight text,
  current_provider text,
  requirements text,
  value numeric(14,2) not null default 0,
  linked_customer_id uuid references customers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  author_name text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  contact text,
  route text,
  mode text,
  quote_date date not null default current_date,
  valid_until date,
  status text not null default 'Pending' check (status in ('Pending','Approved','Declined')),
  created_at timestamptz not null default now()
);

create table quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  description text not null,
  qty numeric(10,2) not null default 1,
  rate numeric(14,2) not null default 0
);

-- ============================================================
-- FLEET & DRIVERS
-- ============================================================
create table drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  license_no text,
  license_expiry date,
  status text not null default 'Available' check (status in ('Available','On trip','Off duty')),
  trips_completed integer not null default 0,
  rating numeric(2,1),
  created_at timestamptz not null default now()
);

create table fleet_vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  type text not null,
  status text not null default 'Available' check (status in ('Available','In Transit','Maintenance','Out of service','Idle')),
  driver_id uuid references drivers(id) on delete set null,
  next_service_date date,
  fuel_liters numeric(10,2) default 0,
  insurer text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SHIPMENT OPERATIONS
-- ============================================================
create sequence booking_seq start 1;

create table bookings (
  id uuid primary key default gen_random_uuid(),
  tracking_no text not null unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  origin text not null,
  destination text not null,
  type text not null check (type in ('Road','Haulage','Air','Sea')),
  status text not null default 'Pending' check (status in ('Pending','Assigned','In Transit','Delivered','Exception','Cancelled')),
  pickup_date date not null,
  weight text,
  declared_value numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- Generates JAAD/DDMM/YYYY/##### from the pickup date, matching the prototype's format.
create or replace function generate_tracking_no(p_pickup date)
returns text
language plpgsql
as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('booking_seq');
  return 'JAAD/' || to_char(p_pickup,'DDMM') || '/' || to_char(p_pickup,'YYYY') || '/' || lpad(seq_val::text,5,'0');
end;
$$;

create or replace function trg_set_tracking_no()
returns trigger
language plpgsql
as $$
begin
  new.tracking_no := generate_tracking_no(new.pickup_date);
  return new;
end;
$$;

create trigger bookings_set_tracking_no
before insert on bookings
for each row
when (new.tracking_no is null or new.tracking_no = '')
execute function trg_set_tracking_no();

create table tracking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  event_time timestamptz not null default now(),
  description text not null
);

create sequence manifest_seq start 1;

create table manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_no text not null unique,
  manifest_date date not null default current_date,
  driver_id uuid references drivers(id) on delete set null,
  driver_name text,
  vehicle_id uuid references fleet_vehicles(id) on delete set null,
  vehicle_plate text,
  route text,
  created_at timestamptz not null default now()
);

create table manifest_shipments (
  manifest_id uuid not null references manifests(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  primary key (manifest_id, booking_id)
);

create table returns (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  tracking_no text not null,
  customer_name text,
  reason text,
  status text not null default 'Open' check (status in ('Open','Resolved')),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FINANCE
-- ============================================================
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  amount numeric(14,2) not null default 0,
  status text not null default 'Pending' check (status in ('Paid','Pending','Overdue')),
  invoice_date date not null default current_date,
  linked_booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null default 0
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  vendor text not null,
  amount numeric(14,2) not null default 0,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null default 0
);

-- ============================================================
-- HR & CAREERS
-- ============================================================
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  role_title text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  email text,
  phone text,
  hired_year text,
  photo_url text,
  gross_pay numeric(14,2),
  deductions numeric(14,2),
  created_at timestamptz not null default now()
);

create table applicants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_applied_for text,
  stage text not null default 'Screening' check (stage in ('Screening','Interview','Offer')),
  created_at timestamptz not null default now()
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete set null,
  employee_name text not null,
  leave_type text not null,
  from_date date not null,
  to_date date not null,
  status text not null default 'Requested' check (status in ('Requested','Approved','Declined')),
  reason text,
  requested_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WAREHOUSE
-- ============================================================
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  qty integer not null default 0,
  reorder_level integer not null default 0,
  location text,
  status text not null default 'In stock' check (status in ('In stock','Low stock')),
  created_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_no text not null unique,
  supplier text not null,
  total numeric(14,2) not null default 0,
  status text not null default 'Pending' check (status in ('Pending','Ordered','Received')),
  items_description text,
  po_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SUPPORT
-- ============================================================
create table tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  customer_name text,
  subject text not null,
  priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  status text not null default 'Open' check (status in ('Open','Resolved')),
  channel text check (channel in ('WhatsApp','Call','Email','Web chat')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  sender_type text not null check (sender_type in ('visitor','agent')),
  body text,
  image_url text,
  sent_at timestamptz not null default now()
);

create table kb_articles (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);
