begin;

create or replace function public.create_manifest_from_bookings(
  target_booking_ids uuid[],
  target_driver_name text,
  target_vehicle_plate text,
  target_route text
)
returns public.manifests
language plpgsql
security definer
set search_path = public
as $$
declare
  created_manifest public.manifests%rowtype;
  selected_count integer;
  sequence_number bigint;
begin
  if auth.uid() is null or not auth_has_module('shipments') then
    raise exception 'Shipment access required';
  end if;
  if coalesce(array_length(target_booking_ids, 1), 0) = 0 then
    raise exception 'Select at least one shipment';
  end if;

  select count(*) into selected_count from public.bookings
  where id = any(target_booking_ids) and status = 'Assigned';
  if selected_count <> array_length(target_booking_ids, 1) then
    raise exception 'Every shipment in a manifest must be assigned';
  end if;

  select nextval('public.manifest_seq') into sequence_number;
  insert into public.manifests (manifest_no, manifest_date, driver_id, driver_name, vehicle_id, vehicle_plate, route)
  select
    'MNF/JAAD/' || to_char(current_date, 'DDMM/YYYY') || '/' || lpad(sequence_number::text, 3, '0'),
    current_date,
    d.id,
    target_driver_name,
    v.id,
    target_vehicle_plate,
    nullif(trim(target_route), '')
  from (select 1) seed
  left join public.drivers d on d.name = target_driver_name
  left join public.fleet_vehicles v on v.plate = target_vehicle_plate
  returning * into created_manifest;

  insert into public.manifest_shipments (manifest_id, booking_id)
  select created_manifest.id, unnest(target_booking_ids);

  update public.bookings set status = 'In Transit' where id = any(target_booking_ids);
  insert into public.tracking_events (booking_id, description)
  select unnest(target_booking_ids), 'Added to manifest ' || created_manifest.manifest_no;

  return created_manifest;
end;
$$;

create or replace function public.record_proof_of_delivery(
  target_booking_id uuid,
  receiver_name text,
  delivery_notes text
)
returns public.proof_of_delivery
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_pod public.proof_of_delivery%rowtype;
begin
  if auth.uid() is null or not auth_has_module('shipments') then
    raise exception 'Shipment access required';
  end if;
  if not exists (select 1 from public.bookings where id = target_booking_id) then
    raise exception 'Shipment not found';
  end if;

  insert into public.proof_of_delivery (booking_id, received_by, recorded_by, status, delivered_at, notes)
  values (target_booking_id, receiver_name, coalesce(auth.jwt() ->> 'email', 'JAAD staff'), 'Delivered', now(), delivery_notes)
  on conflict (booking_id) do update
    set received_by = excluded.received_by,
        recorded_by = excluded.recorded_by,
        status = excluded.status,
        delivered_at = excluded.delivered_at,
        notes = excluded.notes
  returning * into saved_pod;

  update public.bookings set status = 'Delivered' where id = target_booking_id;
  insert into public.tracking_events (booking_id, description)
  values (target_booking_id, 'Delivered, received by ' || receiver_name);
  return saved_pod;
end;
$$;

revoke all on function public.create_manifest_from_bookings(uuid[], text, text, text) from public;
revoke all on function public.record_proof_of_delivery(uuid, text, text) from public;
grant execute on function public.create_manifest_from_bookings(uuid[], text, text, text) to authenticated;
grant execute on function public.record_proof_of_delivery(uuid, text, text) to authenticated;

commit;