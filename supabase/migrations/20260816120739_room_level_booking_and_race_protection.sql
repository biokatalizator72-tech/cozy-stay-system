-- ============================================================
-- Valódi szoba-szintű foglalás + dupla foglalás elleni védelem
-- ============================================================
-- Ez a migráció:
--   1. Bevezeti a btree_gist extension-t (kell az EXCLUDE constrainthez)
--   2. Adatbázis-szintű EXCLUDE constraint-et ad a bookings táblához,
--      ami eleve lehetetlenné teszi, hogy ugyanarra a room_id-ra két
--      aktív (pending/confirmed) foglalás jöjjön létre átfedő dátummal
--   3. Létrehoz egy atomi RPC function-t (create_booking_with_room),
--      ami FOR UPDATE SKIP LOCKED zárolással konkrét, szabad room_id-t
--      választ egy adott típuson belül, és ugyanabban a tranzakcióban
--      beszúrja a foglalást — ezt hívja majd a create-booking edge function
--   4. Eltávolítja a room_type_availability táblát, mert soha nem volt
--      ténylegesen bekötve (a check-availability lekérdezte, de nem
--      használta fel a választ) — félbehagyott korábbi próbálkozás maradványa

-- 1. Extension az exclusion constrainthez (UUID egyenlőség + daterange átfedés)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Adatbázis-szintű védelem dupla foglalás ellen
--    (NULL room_id-jú sorokat nem védi, de az új create-booking logika
--    mindig konkrét room_id-t fog beszúrni)
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlapping_room
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));

-- 3. Atomi, konkrét szobát választó és lefoglaló RPC function
CREATE OR REPLACE FUNCTION public.create_booking_with_room(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_total_price numeric,
  p_special_requests text,
  p_guest_data jsonb
)
RETURNS public.bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_room_id uuid;
  v_booking public.bookings;
BEGIN
  -- Konkrét, az adott időszakban szabad szoba kiválasztása és zárolása.
  -- A FOR UPDATE SKIP LOCKED miatt egy párhuzamos hívás nem ugyanazt a
  -- szobát fogja kiválasztani, hanem a következő szabadat (vagy ha nincs
  -- több, kivételt dob).
  SELECT r.id INTO v_room_id
  FROM public.rooms r
  WHERE r.room_type_id = p_room_type_id
    AND r.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.room_id = r.id
        AND b.status IN ('pending', 'confirmed')
        AND daterange(b.check_in, b.check_out, '[)')
            && daterange(p_check_in, p_check_out, '[)')
    )
  ORDER BY r.sort_order
  FOR UPDATE OF r SKIP LOCKED
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'NO_ROOM_AVAILABLE'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.bookings (
    room_id, room_type_id, check_in, check_out,
    guest_name, guest_email, guest_phone,
    total_price, special_requests, guest_data, status
  )
  VALUES (
    v_room_id, p_room_type_id, p_check_in, p_check_out,
    p_guest_name, p_guest_email, p_guest_phone,
    p_total_price, p_special_requests, COALESCE(p_guest_data, '{}'::jsonb), 'pending'
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- 4. Kihasználatlan, félig bekötött tábla eltávolítása
DROP TABLE IF EXISTS public.room_type_availability;
