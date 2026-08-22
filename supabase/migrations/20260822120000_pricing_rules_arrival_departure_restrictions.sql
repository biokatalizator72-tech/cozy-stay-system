-- Az admin Ártábla oldalon a "Korlátozások" nézet mostantól nemcsak a
-- minimum tartózkodást tudja szerkeszteni naponta, hanem azt is, hogy egy
-- adott nap érkezési, illetve távozási napként tiltott-e (a Booking.com /
-- szallas.hu extranet "Nem érkezési nap" / "Nem távozási nap" mintájára).
--
-- A pricing_rules táblában egy sor mindig egyetlen napot fed le
-- (start_date = end_date), amikor az admin ténylegesen szerkesztette azt a
-- napot valamelyik szobatípushoz - ez a két új oszlop ugyanerre a sorra ül
-- rá, alapértelmezetten false (nincs korlátozás).
ALTER TABLE public.pricing_rules
  ADD COLUMN closed_to_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN closed_to_departure boolean NOT NULL DEFAULT false;
