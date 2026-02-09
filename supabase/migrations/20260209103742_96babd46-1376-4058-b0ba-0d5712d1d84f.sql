-- 1. Create room_types table (takes over room definitions)
CREATE TABLE public.room_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  base_capacity integer NOT NULL DEFAULT 2,
  extra_beds integer NOT NULL DEFAULT 0,
  adult_extra_beds integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 2,
  base_price numeric NOT NULL DEFAULT 0,
  amenities jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on room_types
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_types
CREATE POLICY "Admins can manage room types" 
ON public.room_types 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active room types" 
ON public.room_types 
FOR SELECT 
USING ((is_active = true) OR ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role)));

-- Trigger for updated_at
CREATE TRIGGER update_room_types_updated_at
BEFORE UPDATE ON public.room_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create room_type_images table
CREATE TABLE public.room_type_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on room_type_images
ALTER TABLE public.room_type_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_type_images
CREATE POLICY "Admins can manage room type images" 
ON public.room_type_images 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view room type images" 
ON public.room_type_images 
FOR SELECT 
USING (true);

-- 3. Create room_type_availability table for contingent management
CREATE TABLE public.room_type_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  available_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_type_id, date)
);

-- Enable RLS on room_type_availability
ALTER TABLE public.room_type_availability ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_type_availability
CREATE POLICY "Admins can manage room type availability" 
ON public.room_type_availability 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view room type availability" 
ON public.room_type_availability 
FOR SELECT 
USING (true);

-- 4. Migrate existing rooms data to room_types
INSERT INTO public.room_types (id, name, description, base_capacity, extra_beds, adult_extra_beds, capacity, base_price, amenities, is_active, sort_order, created_at, updated_at)
SELECT id, name, description, base_capacity, extra_beds, adult_extra_beds, capacity, base_price, amenities, is_active, sort_order, created_at, updated_at
FROM public.rooms;

-- 5. Migrate room_images to room_type_images
INSERT INTO public.room_type_images (id, room_type_id, image_url, sort_order, created_at)
SELECT id, room_id, image_url, sort_order, created_at
FROM public.room_images;

-- 6. Add room_type_id column to rooms table
ALTER TABLE public.rooms ADD COLUMN room_type_id uuid REFERENCES public.room_types(id) ON DELETE SET NULL;

-- 7. Update rooms to reference their own type (self-reference for migration)
UPDATE public.rooms SET room_type_id = id;

-- 8. Add room_type_id column to pricing_rules
ALTER TABLE public.pricing_rules ADD COLUMN room_type_id uuid REFERENCES public.room_types(id) ON DELETE CASCADE;

-- 9. Migrate pricing_rules to use room_type_id
UPDATE public.pricing_rules SET room_type_id = room_id;