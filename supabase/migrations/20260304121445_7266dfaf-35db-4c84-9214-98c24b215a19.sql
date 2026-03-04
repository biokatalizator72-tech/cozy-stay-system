-- Recreate property_settings_public WITHOUT security_invoker
DROP VIEW IF EXISTS public.property_settings_public;
CREATE VIEW public.property_settings_public AS
SELECT id, name, description, address, phone, email,
       latitude, longitude, guest_fields, created_at, updated_at
FROM public.property_settings;
GRANT SELECT ON public.property_settings_public TO anon, authenticated;

-- Recreate bookings_availability WITHOUT security_invoker
DROP VIEW IF EXISTS public.bookings_availability;
CREATE VIEW public.bookings_availability AS
SELECT room_type_id, check_in, check_out, status
FROM public.bookings
WHERE status IN ('pending', 'confirmed');
GRANT SELECT ON public.bookings_availability TO anon, authenticated;