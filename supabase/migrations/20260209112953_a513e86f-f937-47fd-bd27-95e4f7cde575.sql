ALTER TABLE public.bookings 
  ADD COLUMN room_type_id uuid REFERENCES public.room_types(id);