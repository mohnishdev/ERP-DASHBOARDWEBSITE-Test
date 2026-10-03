begin;

insert into public.roles (name, description, permitted_modules) values
  ('Sales & Lead Manager','Owns the pipeline and converts qualified prospects into customers.',array['dashboard','crm','customers']),
  ('CRM Specialist','Works leads, notes and follow-ups.',array['dashboard','crm']),
  ('Fleet Manager','Manages vehicles, drivers and maintenance.',array['dashboard','fleet','drivers']),
  ('Warehouse Manager','Manages inventory and stock levels.',array['dashboard','warehouse']),
  ('HR Manager','Manages employees, recruitment and leave.',array['dashboard','hr']),
  ('Support Agent','Manages customer tickets and support conversations.',array['dashboard','support'])
on conflict (name) do nothing;

commit;