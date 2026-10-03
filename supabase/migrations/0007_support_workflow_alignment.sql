begin;

alter table public.tickets
  drop constraint if exists tickets_channel_check;
alter table public.tickets
  add constraint tickets_channel_check
  check (channel in ('WhatsApp','Call','Email','Web chat','Live chat','SMS'));

alter table public.support_emails
  add column if not exists cc text not null default '',
  add column if not exists bcc text not null default '',
  add column if not exists invoice_no text not null default '',
  add column if not exists attachment_url text not null default '',
  add column if not exists attachment_name text not null default '',
  add column if not exists folder text not null default 'sent';

alter table public.support_calls
  add column if not exists duration text not null default '00:00',
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

alter table public.support_whatsapp
  add column if not exists attachment_url text not null default '',
  add column if not exists attachment_name text not null default '';

create table if not exists public.support_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);
alter table public.support_email_templates enable row level security;
drop policy if exists support_email_templates_support on public.support_email_templates;
create policy support_email_templates_support on public.support_email_templates for all
  using (auth_has_module('support'))
  with check (auth_has_module('support'));

drop policy if exists team_chat_support on public.team_chat_messages;
create policy team_chat_support on public.team_chat_messages for all
  using (auth_has_module('support'))
  with check (auth_has_module('support'));

commit;