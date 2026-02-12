
-- 1. Rebuild property_settings_public view WITHOUT security_invoker
DROP VIEW IF EXISTS property_settings_public;
CREATE VIEW property_settings_public AS
  SELECT id, name, description, address, phone, email,
         latitude, longitude, guest_fields, created_at, updated_at
  FROM property_settings;
GRANT SELECT ON property_settings_public TO anon, authenticated;

-- 2. Create bookings_availability view for guest-side availability checks
CREATE VIEW bookings_availability AS
  SELECT room_type_id, check_in, check_out, status
  FROM bookings
  WHERE status IN ('pending', 'confirmed');
GRANT SELECT ON bookings_availability TO anon, authenticated;
