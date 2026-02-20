
-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This ensures views respect the querying user's RLS policies

-- Recreate property_settings_public view with SECURITY INVOKER
DROP VIEW IF EXISTS public.property_settings_public;

CREATE VIEW public.property_settings_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  description,
  address,
  email,
  phone,
  latitude,
  longitude,
  guest_fields,
  created_at,
  updated_at
FROM public.property_settings;

-- Recreate bookings_availability view with SECURITY INVOKER
DROP VIEW IF EXISTS public.bookings_availability;

CREATE VIEW public.bookings_availability
WITH (security_invoker = true)
AS
SELECT
  check_in,
  check_out,
  room_type_id,
  status
FROM public.bookings;

-- Grant SELECT on the views to anon and authenticated roles
GRANT SELECT ON public.property_settings_public TO anon, authenticated;
GRANT SELECT ON public.bookings_availability TO anon, authenticated;
