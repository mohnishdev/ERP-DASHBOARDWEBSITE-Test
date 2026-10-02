-- Row Level Security: every table is readable/writable only by authenticated
-- users whose role grants the relevant module. Super Admin (all modules) sees everything.

alter table roles enable row level security;
alter table profiles enable row level security;
alter table audit_log enable row level security;
alter table customers enable row level security;
alter table leads enable row level security;
alter table lead_notes enable row level security;
alter table quotations enable row level security;
alter table quotation_items enable row level security;
alter table drivers enable row level security;
alter table fleet_vehicles enable row level security;
alter table bookings enable row level security;
alter table tracking_events enable row level security;
alter table manifests enable row level security;
alter table manifest_shipments enable row level security;
alter table returns enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table expenses enable row level security;
alter table expense_items enable row level security;
alter table employees enable row level security;
alter table applicants enable row level security;
alter table leave_requests enable row level security;
alter table inventory_items enable row level security;
alter table purchase_orders enable row level security;
alter table tickets enable row level security;
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;
alter table kb_articles enable row level security;

-- Every authenticated user can read their own profile and the roles list
-- (needed to render the sidebar), regardless of module grants.
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update using (id = auth.uid());
create policy roles_read_all on roles for select using (auth.uid() is not null);

-- Generic pattern applied per module. Example shown for CRM (leads, lead_notes,
-- quotations, quotation_items) — the same shape repeats for every module below.
create policy leads_by_module on leads for all
  using (auth_has_module('crm')) with check (auth_has_module('crm'));
create policy lead_notes_by_module on lead_notes for all
  using (auth_has_module('crm')) with check (auth_has_module('crm'));
create policy quotations_by_module on quotations for all
  using (auth_has_module('crm')) with check (auth_has_module('crm'));
create policy quotation_items_by_module on quotation_items for all
  using (auth_has_module('crm')) with check (auth_has_module('crm'));

create policy customers_by_module on customers for all
  using (auth_has_module('customers')) with check (auth_has_module('customers'));

create policy bookings_by_module on bookings for all
  using (auth_has_module('shipments')) with check (auth_has_module('shipments'));
create policy tracking_events_by_module on tracking_events for all
  using (auth_has_module('shipments')) with check (auth_has_module('shipments'));
create policy manifests_by_module on manifests for all
  using (auth_has_module('shipments')) with check (auth_has_module('shipments'));
create policy manifest_shipments_by_module on manifest_shipments for all
  using (auth_has_module('shipments')) with check (auth_has_module('shipments'));
create policy returns_by_module on returns for all
  using (auth_has_module('shipments')) with check (auth_has_module('shipments'));

create policy drivers_by_module on drivers for all
  using (auth_has_module('drivers')) with check (auth_has_module('drivers'));
create policy fleet_by_module on fleet_vehicles for all
  using (auth_has_module('fleet')) with check (auth_has_module('fleet'));

create policy invoices_by_module on invoices for all
  using (auth_has_module('finance')) with check (auth_has_module('finance'));
create policy invoice_items_by_module on invoice_items for all
  using (auth_has_module('finance')) with check (auth_has_module('finance'));
create policy expenses_by_module on expenses for all
  using (auth_has_module('finance')) with check (auth_has_module('finance'));
create policy expense_items_by_module on expense_items for all
  using (auth_has_module('finance')) with check (auth_has_module('finance'));

create policy employees_by_module on employees for all
  using (auth_has_module('hr')) with check (auth_has_module('hr'));
create policy applicants_by_module on applicants for all
  using (auth_has_module('hr')) with check (auth_has_module('hr'));
create policy leave_by_module on leave_requests for all
  using (auth_has_module('hr')) with check (auth_has_module('hr'));

create policy inventory_by_module on inventory_items for all
  using (auth_has_module('warehouse')) with check (auth_has_module('warehouse'));
create policy po_by_module on purchase_orders for all
  using (auth_has_module('warehouse')) with check (auth_has_module('warehouse'));

create policy tickets_by_module on tickets for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy chat_threads_by_module on chat_threads for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy chat_messages_by_module on chat_messages for all
  using (auth_has_module('support')) with check (auth_has_module('support'));
create policy kb_by_module on kb_articles for all
  using (auth_has_module('support')) with check (auth_has_module('support'));

-- Admin-only tables
create policy audit_log_admin on audit_log for select
  using (auth_has_module('admin'));
create policy audit_log_insert_any_authenticated on audit_log for insert
  with check (auth.uid() is not null);
create policy roles_admin_write on roles for insert with check (auth_has_module('admin'));
create policy roles_admin_update on roles for update using (auth_has_module('admin'));
create policy roles_admin_delete on roles for delete using (auth_has_module('admin'));
create policy profiles_admin_read_all on profiles for select using (auth_has_module('admin'));
create policy profiles_admin_write on profiles for update using (auth_has_module('admin'));
