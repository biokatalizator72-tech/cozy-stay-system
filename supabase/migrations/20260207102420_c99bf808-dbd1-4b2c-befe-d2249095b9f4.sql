-- Drop the overly permissive booking insert policy
DROP POLICY IF EXISTS "Guests can create bookings" ON public.bookings;

-- Create a more secure insert policy (still allows public insert but with validation)
-- Guests can only create bookings with pending status
CREATE POLICY "Guests can create pending bookings" ON public.bookings
    FOR INSERT 
    WITH CHECK (status = 'pending');

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Storage policies for property images
CREATE POLICY "Public can view property images" ON storage.objects
    FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Admins can upload property images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update property images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete property images" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));