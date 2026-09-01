-- Align DB cancel_appointment_by_token with 30-minute online cancellation policy.
create or replace function public.cancel_appointment_by_token(p_token text)
returns public.appointments language plpgsql security definer set search_path = public as $$
declare appt public.appointments;
begin
  if p_token is null or length(trim(p_token)) < 16 then raise exception 'Token non valido'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = now()
  where manage_token = p_token and status in ('pending','confirmed') and starts_at > now() + interval '30 minutes'
  returning * into appt;
  if appt is null then raise exception 'Appuntamento non trovato o non cancellabile (disdetta almeno 30 minuti prima)'; end if;
  return appt;
end;
$$;
