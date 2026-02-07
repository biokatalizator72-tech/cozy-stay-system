-- Admin roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table (CRITICAL: roles MUST be in separate table)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admin profiles table with password change tracking
CREATE TABLE public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Property settings (single row for the property)
CREATE TABLE public.property_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Szálláshely neve',
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    booking_email_template TEXT DEFAULT 'Kedves {guest_name},

Köszönjük foglalását! Az alábbi foglalási adatokat rögzítettük:
- Szoba: {room_name}
- Érkezés: {check_in}
- Távozás: {check_out}
- Végösszeg: {total_price} Ft

Kérjük, utalja el az összeget az alábbi számlaszámra:
[Bankszámlaszám]

Üdvözlettel,
{property_name}',
    ical_url TEXT,
    guest_fields JSONB DEFAULT '["name", "email", "phone", "arrival_time", "special_requests"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_settings ENABLE ROW LEVEL SECURITY;

-- Rooms table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 2,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_nights INTEGER NOT NULL DEFAULT 1,
    amenities JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Room images
CREATE TABLE public.room_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;

-- Property images
CREATE TABLE public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Pricing rules (date-based pricing)
CREATE TABLE public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    min_nights INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    arrival_time TEXT,
    special_requests TEXT,
    guest_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- iCal blocked dates (from external calendars)
CREATE TABLE public.ical_blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    blocked_date DATE NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(room_id, blocked_date)
);

ALTER TABLE public.ical_blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: only admins can manage
CREATE POLICY "Admins can view roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin profiles: users can only access their own
CREATE POLICY "Users can view own profile" ON public.admin_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.admin_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Property settings: public read, admin write
CREATE POLICY "Anyone can view property settings" ON public.property_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can update property settings" ON public.property_settings
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert property settings" ON public.property_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rooms: public read, admin write
CREATE POLICY "Anyone can view active rooms" ON public.rooms
    FOR SELECT USING (is_active = true OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can manage rooms" ON public.rooms
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Room images: public read, admin write
CREATE POLICY "Anyone can view room images" ON public.room_images
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage room images" ON public.room_images
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Property images: public read, admin write
CREATE POLICY "Anyone can view property images" ON public.property_images
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage property images" ON public.property_images
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pricing rules: public read, admin write
CREATE POLICY "Anyone can view pricing rules" ON public.pricing_rules
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage pricing rules" ON public.pricing_rules
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bookings: public insert (for guests), admin full access
CREATE POLICY "Guests can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bookings" ON public.bookings
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings" ON public.bookings
    FOR DELETE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- iCal blocked dates: public read, admin write
CREATE POLICY "Anyone can view blocked dates" ON public.ical_blocked_dates
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage blocked dates" ON public.ical_blocked_dates
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_admin_profiles_updated_at
    BEFORE UPDATE ON public.admin_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_settings_updated_at
    BEFORE UPDATE ON public.property_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at
    BEFORE UPDATE ON public.pricing_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default property settings
INSERT INTO public.property_settings (name, description) VALUES ('Szálláshely neve', 'Üdvözöljük szálláshelyünkön!');