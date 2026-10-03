begin;

alter table public.employees
  drop constraint if exists employees_status_check;

alter table public.employees
  add constraint employees_status_check
  check (status in ('Active','On leave','Sacked','Inactive'));

alter table public.employees
  add column if not exists eoy_votes integer not null default 0 check (eoy_votes >= 0);

commit;