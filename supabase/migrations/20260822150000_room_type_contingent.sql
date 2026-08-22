-- Kontingens (allotment) szobatípusonként és naponta: hány szobát szabad
-- ELADNI ezen a csatornán (weboldal + Vapi telefonos asszisztens) egy
-- adott napra egy szobatípusból. Ha egy adott nap+szobatípushoz nincs
-- sor, nincs csatorna-korlát: a teljes fizikai szobaszám (rooms tábla)
-- számít felső határnak.
--
-- Ezzel lehet szobát tudatosan tartalékolni más értékesítési
-- csatornáknak (pl. Booking.com), amik nincsenek élő szinkronban ezzel a
-- rendszerrel - Tomi az admin Ártáblán állítja be naponta/szobatípusonként,
-- ha csökkenteni akarja az itt eladható szobák számát a fizikai
-- állomány alá.
CREATE TABLE public.room_type_contingent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  contingent integer NOT NULL CHECK (contingent >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_type_id, date)
);

ALTER TABLE public.room_type_contingent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contingent" ON public.room_type_contingent
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage contingent" ON public.room_type_contingent
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_room_type_contingent_updated_at
  BEFORE UPDATE ON public.room_type_contingent
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
