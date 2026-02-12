
-- Create a public view excluding sensitive fields
CREATE VIEW public.property_settings_public
WITH (security_invoker = on) AS
SELECT id, name, description, address, phone, email, latitude, longitude, guest_fields, created_at, updated_at
FROM public.property_settings;

-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view property settings" ON public.property_settings;

-- Create a new SELECT policy: only admins can read the base table
CREATE POLICY "Only admins can view property settings"
ON public.property_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
