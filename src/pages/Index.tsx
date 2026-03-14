import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RoomCard } from '@/components/guest/RoomCard';
import { PropertyHero } from '@/components/guest/PropertyHero';
import { SearchForm, ChildAgeBracket, GuestCounts } from '@/components/guest/SearchForm';
import { MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { format, eachDayOfInterval, addDays } from 'date-fns';

interface PropertySettings {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface RoomType {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  base_capacity: number;
  base_price: number;
  amenities: string[];
  sort_order: number;
}

interface RoomTypeImage {
  id: string;
  room_type_id: string;
  image_url: string;
  sort_order: number;
}

interface PropertyImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface SearchParams {
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: { bracketId: string; count: number }[];
}

export default function Index() {
  const [property, setProperty] = useState<PropertySettings | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomTypeImages, setRoomTypeImages] = useState<Record<string, RoomTypeImage[]>>({});
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [childAgeBrackets, setChildAgeBrackets] = useState<ChildAgeBracket[]>([]);
  const [seasons, setSeasons] = useState<{ start_date: string; end_date: string }[]>([]);
  const [nightDiscounts, setNightDiscounts] = useState<{ min_nights: number; discount_percent: number }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [availableRoomTypes, setAvailableRoomTypes] = useState<RoomType[]>([]);
  const [totalPrices, setTotalPrices] = useState<Record<string, number>>({});
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});
  const [discountPercent, setDiscountPercent] = useState(0);
  const [nights, setNights] = useState(0);
  const [minNightsMap, setMinNightsMap] = useState<Record<string, number>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState(10);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch property settings
      const { data: propertyData } = await supabase
        .from('property_settings_public' as any)
        .select('*')
        .maybeSingle();

      // Fetch property images
      const { data: propImagesData } = await supabase
        .from('property_images')
        .select('*')
        .order('sort_order');

      // Fetch active room types
      const { data: roomTypesData } = await supabase
        .from('room_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      // Fetch room type images
      const { data: roomTypeImagesData } = await supabase
        .from('room_type_images')
        .select('*')
        .order('sort_order');

      // Fetch child age brackets
      const { data: bracketsData } = await supabase
        .from('child_age_brackets')
        .select('*')
        .order('sort_order');

      // Fetch night discounts
      const { data: nightDiscountsData } = await supabase
        .from('night_discounts')
        .select('min_nights, discount_percent')
        .order('min_nights');

      // Fetch active seasons
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('start_date, end_date')
        .eq('is_active', true)
        .order('start_date');

      setProperty(propertyData as any);
      setPropertyImages(propImagesData || []);
      setChildAgeBrackets(bracketsData || []);
      setSeasons(seasonsData || []);
      setNightDiscounts(nightDiscountsData || []);
      
      const transformed: RoomType[] = (roomTypesData || []).map(rt => ({
        ...rt,
        amenities: Array.isArray(rt.amenities) 
          ? (rt.amenities as unknown[]).map(a => String(a))
          : [],
      }));
      setRoomTypes(transformed);

      // Calculate max capacity from room types
      if (transformed.length > 0) {
        const max = Math.max(...transformed.map(r => r.capacity));
        setMaxCapacity(max);
      }

      const imagesByType: Record<string, RoomTypeImage[]> = {};
      roomTypeImagesData?.forEach((img) => {
        if (!imagesByType[img.room_type_id]) {
          imagesByType[img.room_type_id] = [];
        }
        imagesByType[img.room_type_id].push(img);
      });
      setRoomTypeImages(imagesByType);

      setLoading(false);
    }

    fetchData();
  }, []);

  const handleSearch = async (checkIn: Date, checkOut: Date, guestCounts: GuestCounts) => {
    setIsSearching(true);
    
    // Calculate total guests
    const totalChildren = guestCounts.children.reduce((sum, c) => sum + c.count, 0);
    const totalGuests = guestCounts.adults + totalChildren;
    
    setSearchParams({ 
      checkIn, 
      checkOut, 
      adults: guestCounts.adults,
      children: guestCounts.children
    });

    const checkInStr = format(checkIn, 'yyyy-MM-dd');
    const checkOutStr = format(checkOut, 'yyyy-MM-dd');

    // Get all dates in the range (excluding checkout day)
    const stayDatesInterval = eachDayOfInterval({
      start: checkIn,
      end: addDays(checkOut, -1),
    });
    const stayDates = stayDatesInterval.map(d => format(d, 'yyyy-MM-dd'));

    // Fetch room_type_availability for the date range
    const { data: availabilityData } = await supabase
      .from('room_type_availability')
      .select('room_type_id, date, available_count')
      .gte('date', checkInStr)
      .lte('date', format(addDays(checkOut, -1), 'yyyy-MM-dd'));

    // Fetch bookings that overlap with the selected dates (via public view)
    const { data: bookingsData } = await supabase
      .from('bookings_availability' as any)
      .select('room_type_id, check_in, check_out')
      .not('room_type_id', 'is', null)
      .lte('check_in', checkOutStr)
      .gte('check_out', checkInStr);

    // Build availability map: room_type_id -> date -> available_count
    const availMap: Record<string, Record<string, number>> = {};
    availabilityData?.forEach((row) => {
      if (!availMap[row.room_type_id]) {
        availMap[row.room_type_id] = {};
      }
      availMap[row.room_type_id][row.date] = row.available_count;
    });

    // Build booking count map: room_type_id -> date -> booked_count
    const bookingCountMap: Record<string, Record<string, number>> = {};
    (bookingsData as any[] | null)?.forEach((booking: any) => {
      if (!booking.room_type_id) return;
      const bookingStart = new Date(booking.check_in);
      const bookingEnd = new Date(booking.check_out);
      
      stayDates.forEach((dateStr) => {
        const date = new Date(dateStr);
        if (date >= bookingStart && date < bookingEnd) {
          if (!bookingCountMap[booking.room_type_id]) {
            bookingCountMap[booking.room_type_id] = {};
          }
          bookingCountMap[booking.room_type_id][dateStr] = 
            (bookingCountMap[booking.room_type_id][dateStr] || 0) + 1;
        }
      });
    });

    // Filter room types: capacity >= totalGuests AND available on ALL stay dates
    const filtered = roomTypes.filter((rt) => {
      if (rt.capacity < totalGuests) return false;

      // Check every stay date
      return stayDates.every((dateStr) => {
        const adminCount = availMap[rt.id]?.[dateStr] ?? 0;
        const bookedCount = bookingCountMap[rt.id]?.[dateStr] ?? 0;
        const free = adminCount - bookedCount;
        return free >= 1;
      });
    });

    // Sort: exact capacity match first, then by capacity difference, then by sort_order
    const sorted = [...filtered].sort((a, b) => {
      const diffA = Math.abs(a.capacity - totalGuests);
      const diffB = Math.abs(b.capacity - totalGuests);
      
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      return a.sort_order - b.sort_order;
    });

    // Fetch pricing rules for total price calculation
    const roomTypeIds = sorted.map(rt => rt.id);
    const { data: pricingRules } = await supabase
      .from('pricing_rules')
      .select('room_type_id, start_date, end_date, price_per_night, min_nights')
      .in('room_type_id', roomTypeIds);

    const calculatedPrices: Record<string, number> = {};
    sorted.forEach(rt => {
      let total = 0;
      stayDates.forEach(dateStr => {
        const rule = pricingRules?.find(r =>
          r.room_type_id === rt.id && r.start_date <= dateStr && r.end_date >= dateStr
        );
        const nightlyRate = rule ? Number(rule.price_per_night) : rt.base_price;
        // Base room price (covers base occupancy)
        total += nightlyRate;
        // Extra adults beyond base_capacity pay per-person rate with adult bracket discount
        const extraAdults = Math.max(0, guestCounts.adults - rt.base_capacity);
        if (extraAdults > 0) {
          const adultBracket = childAgeBrackets
            .filter(b => b.from_age >= 12)
            .sort((a, b) => b.from_age - a.from_age)[0];
          const adultDiscountPercent = adultBracket?.discount_percent ?? 0;
          const perPersonRate = nightlyRate / rt.base_capacity;
          total += perPersonRate * (1 - adultDiscountPercent / 100) * extraAdults;
        }
        // Children: free slots fill base_capacity first, extras pay discounted per-person rate
        const freeChildSlots = Math.max(0, rt.base_capacity - guestCounts.adults);
        let remainingFreeSlots = freeChildSlots;
        guestCounts.children.forEach(child => {
          if (child.count <= 0) return;
          const absorbed = Math.min(remainingFreeSlots, child.count);
          const paidCount = child.count - absorbed;
          remainingFreeSlots -= absorbed;
          if (paidCount > 0) {
            const bracket = childAgeBrackets.find(b => b.id === child.bracketId);
            const discountPercent = bracket?.discount_percent ?? 0;
            const perPersonRate = nightlyRate / rt.base_capacity;
            total += perPersonRate * (1 - discountPercent / 100) * paidCount;
          }
        });
      });
      calculatedPrices[rt.id] = total;
    });

    // Apply night discount
    const applicableDiscount = nightDiscounts
      .filter(d => stayDates.length >= d.min_nights)
      .sort((a, b) => b.min_nights - a.min_nights)[0];

    const dp = applicableDiscount?.discount_percent ?? 0;
    setDiscountPercent(dp);

    const discountedPrices: Record<string, number> = {};
    if (dp > 0) {
      Object.entries(calculatedPrices).forEach(([id, price]) => {
        discountedPrices[id] = Math.round(price * (1 - dp / 100));
      });
    }

    // Calculate min_nights per room type
    const minNightsPerRoom: Record<string, number> = {};
    sorted.forEach(rt => {
      let maxMinNights = 1;
      stayDates.forEach(dateStr => {
        const rule = pricingRules?.find(r =>
          r.room_type_id === rt.id && r.start_date <= dateStr && r.end_date >= dateStr
        );
        if (rule?.min_nights && rule.min_nights > maxMinNights) {
          maxMinNights = rule.min_nights;
        }
      });
      minNightsPerRoom[rt.id] = maxMinNights;
    });
    setMinNightsMap(minNightsPerRoom);

    setOriginalPrices(dp > 0 ? calculatedPrices : {});
    setTotalPrices(dp > 0 ? discountedPrices : calculatedPrices);
    setNights(stayDates.length);
    setAvailableRoomTypes(sorted);
    setIsSearching(false);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Format guest summary for display
  const formatGuestSummary = () => {
    if (!searchParams) return '';
    
    const parts: string[] = [];
    parts.push(`${searchParams.adults} felnőtt`);
    
    const totalChildren = searchParams.children.reduce((sum, c) => sum + c.count, 0);
    if (totalChildren > 0) {
      parts.push(`${totalChildren} gyerek`);
    }
    
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-2xl">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <PropertyHero
        name={property?.name || 'Szálláshely'}
        description={property?.description}
        images={propertyImages}
      />

      {/* Search Form Section */}
      <section className="py-8 lg:py-12">
        <div className="container">
          <div className="max-w-4xl mx-auto -mt-16 relative z-10">
            <SearchForm
              maxCapacity={maxCapacity}
              childAgeBrackets={childAgeBrackets}
              seasons={seasons}
              onSearch={handleSearch}
              isSearching={isSearching}
            />
          </div>
        </div>
      </section>

      {/* Room Types Section - only show after search */}
      {searchParams && (
        <section ref={resultsRef} className="py-8 lg:py-16">
          <div className="container">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl lg:text-4xl font-semibold mb-4">
                Elérhető szobák
              </h2>
              <p className="text-muted-foreground">
                {format(searchParams.checkIn, 'yyyy. MMMM d.')} - {format(searchParams.checkOut, 'yyyy. MMMM d.')} • {formatGuestSummary()}
              </p>
            </div>

            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : availableRoomTypes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">Sajnos nincs szabad szoba a megadott feltételekkel.</p>
                <p>Próbáljon más dátumot vagy kevesebb vendéget.</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {availableRoomTypes.map((roomType, index) => (
                  <RoomCard
                    key={roomType.id}
                    room={roomType}
                    images={roomTypeImages[roomType.id] || []}
                    index={index}
                    checkIn={searchParams.checkIn}
                    checkOut={searchParams.checkOut}
                    adults={searchParams.adults}
                    children={searchParams.children}
                    totalPrice={totalPrices[roomType.id]}
                    originalPrice={originalPrices[roomType.id]}
                    discountPercent={discountPercent}
                    nights={nights}
                    minNightsRequired={minNightsMap[roomType.id]}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Contact Section */}
      {(property?.address || property?.phone || property?.email) && (
        <section className="py-16 bg-secondary/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl lg:text-4xl font-semibold mb-4">
                Kapcsolat
              </h2>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="grid gap-6 md:grid-cols-3">
                {property?.address && (
                  <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-2">Cím</h3>
                    <p className="text-muted-foreground text-sm">{property.address}</p>
                  </div>
                )}
                {property?.phone && (
                  <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-2">Telefon</h3>
                    <a
                      href={`tel:${property.phone}`}
                      className="text-muted-foreground text-sm hover:text-primary transition-colors"
                    >
                      {property.phone}
                    </a>
                  </div>
                )}
                {property?.email && (
                  <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-2">Email</h3>
                    <a
                      href={`mailto:${property.email}`}
                      className="text-muted-foreground text-sm hover:text-primary transition-colors"
                    >
                      {property.email}
                    </a>
                  </div>
                )}
              </div>

              {property?.latitude && property?.longitude && (
                <div className="mt-8 aspect-video rounded-xl overflow-hidden shadow-lg">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${property.latitude},${property.longitude}&zoom=15`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {property?.name || 'Szálláshely'}. Minden jog fenntartva.
          </p>
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Admin belépés
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
