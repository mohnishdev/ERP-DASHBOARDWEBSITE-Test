begin;

drop policy if exists customers_finance_read on public.customers;
create policy customers_finance_read on public.customers for select
  using (auth_has_module('finance'));

create table if not exists public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null unique,
  role_title text not null default '',
  gross numeric(14,2) not null default 0 check (gross >= 0),
  deductions numeric(14,2) not null default 0 check (deductions >= 0 and deductions <= gross),
  updated_at timestamptz not null default now()
);

alter table public.payroll_entries enable row level security;

drop policy if exists payroll_entries_finance on public.payroll_entries;
create policy payroll_entries_finance on public.payroll_entries for all
  using (auth_has_module('finance'))
  with check (auth_has_module('finance'));

drop policy if exists purchase_orders_finance on public.purchase_orders;
create policy purchase_orders_finance on public.purchase_orders for all
  using (auth_has_module('finance'))
  with check (auth_has_module('finance'));

drop policy if exists quotations_finance on public.quotations;
create policy quotations_finance on public.quotations for all
  using (auth_has_module('finance'))
  with check (auth_has_module('finance'));

drop policy if exists quotation_items_finance on public.quotation_items;
create policy quotation_items_finance on public.quotation_items for all
  using (auth_has_module('finance'))
  with check (auth_has_module('finance'));

commit;