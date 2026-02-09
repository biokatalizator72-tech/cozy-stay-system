import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInDays, addDays, eachDayOfInterval, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/supabase-helpers';
import { cn } from '@/lib/utils';

interface RoomType {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  base_price: number;
  amenities: string[];
}

interface RoomTypeImage {
  id: string;
  image_url: string;
}

interface PricingRule {
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_nights: number;
}

type DateRange = {
  from: Date;
  to?: Date;
};

export default function BookingPage() {
  const { roomTypeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [images, setImages] = useState<RoomTypeImage[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  // Parse query params for pre-filled dates
  const checkInParam = searchParams.get('checkIn');
  const checkOutParam = searchParams.get('checkOut');

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (checkInParam && checkOutParam) {
      return {
        from: parseISO(checkInParam),
        to: parseISO(checkOutParam),
      };
    }
    return undefined;
  });
  
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    arrival_time: '',
    special_requests: '',
  });

  useEffect(() => {
    async function fetchData() {
      if (!roomTypeId) return;

      // Fetch room type
      const { data: roomTypeData } = await supabase
        .from('room_types')
        .select('*')
        .eq('id', roomTypeId)
        .eq('is_active', true)
        .maybeSingle();

      if (!roomTypeData) {
        navigate('/');
        return;
      }

      // Fetch images
      const { data: imagesData } = await supabase
        .from('room_type_images')
        .select('id, image_url')
        .eq('room_type_id', roomTypeId)
        .order('sort_order');

      // Fetch pricing rules for this room type
      const { data: rulesData } = await supabase
        .from('pricing_rules')
        .select('start_date, end_date, price_per_night, min_nights')
        .eq('room_type_id', roomTypeId);

      const transformed: RoomType = {
        ...roomTypeData,
        amenities: Array.isArray(roomTypeData.amenities)
          ? (roomTypeData.amenities as unknown[]).map(a => String(a))
          : [],
      };

      setRoomType(transformed);
      setImages(imagesData || []);
      setPricingRules(rulesData || []);
      setLoading(false);
    }

    fetchData();
  }, [roomTypeId, navigate]);

  const getPriceForDate = (date: Date): number => {
    if (!roomType) return 0;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const rule = pricingRules.find(
      (r) => r.start_date <= dateStr && r.end_date >= dateStr
    );

    return rule?.price_per_night || roomType.base_price;
  };

  const calculateTotal = (): { nights: number; total: number } => {
    if (!dateRange?.from || !dateRange?.to) return { nights: 0, total: 0 };

    const nights = differenceInDays(dateRange.to, dateRange.from);
    if (nights <= 0) return { nights: 0, total: 0 };

    let total = 0;
    const days = eachDayOfInterval({
      start: dateRange.from,
      end: addDays(dateRange.to, -1),
    });

    days.forEach((day) => {
      total += getPriceForDate(day);
    });

    return { nights, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomType || !dateRange?.from || !dateRange?.to) {
      toast.error('Kérjük válasszon érkezési és távozási dátumot');
      return;
    }

    const { nights, total } = calculateTotal();

    if (nights < 1) {
      toast.error('Legalább 1 éjszakára szükséges foglalni');
      return;
    }

    if (!formData.guest_name || !formData.guest_email) {
      toast.error('Kérjük töltse ki a kötelező mezőket');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('bookings').insert([
      {
        room_type_id: roomType.id,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone || null,
        check_in: format(dateRange.from, 'yyyy-MM-dd'),
        check_out: format(dateRange.to, 'yyyy-MM-dd'),
        total_price: total,
        arrival_time: formData.arrival_time || null,
        special_requests: formData.special_requests || null,
        status: 'pending',
      },
    ]);

    if (error) {
      toast.error('Hiba történt a foglalás során');
      console.error(error);
    } else {
      setSuccess(true);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roomType) {
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full animate-scale-in text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-4">
              Foglalás beküldve!
            </h2>
            <p className="text-muted-foreground mb-6">
              Köszönjük foglalását! Hamarosan emailben értesítjük a további teendőkről.
            </p>
            <Link to="/">
              <Button>Vissza a főoldalra</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { nights, total } = calculateTotal();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-display text-xl font-semibold">{roomType.name} foglalása</h1>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Room type details & Calendar */}
          <div className="space-y-6">
            {/* Image gallery */}
            {images.length > 0 && (
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <img
                  src={images[currentImage].image_url}
                  alt={roomType.name}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImage(idx)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            idx === currentImage ? "bg-white w-6" : "bg-white/60"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Room type info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{roomType.name}</h2>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{roomType.capacity} fő</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(roomType.base_price)}
                    </div>
                    <div className="text-xs text-muted-foreground">/ éjszaka</div>
                  </div>
                </div>

                {roomType.description && (
                  <p className="text-muted-foreground mb-4">{roomType.description}</p>
                )}

                {roomType.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {roomType.amenities.map((amenity, idx) => (
                      <Badge key={idx} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Válasszon dátumot</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange(range as DateRange | undefined)}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  numberOfMonths={1}
                  locale={hu}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: Booking form */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="font-display">Foglalási adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Date summary */}
                  {dateRange?.from && dateRange?.to && (
                    <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Érkezés:</span>
                        <span className="font-medium">
                          {format(dateRange.from, 'yyyy. MMMM d.', { locale: hu })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Távozás:</span>
                        <span className="font-medium">
                          {format(dateRange.to, 'yyyy. MMMM d.', { locale: hu })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{nights} éjszaka</span>
                        <span className="font-bold text-primary text-lg">
                          {formatPrice(total)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="guest_name">Név *</Label>
                    <Input
                      id="guest_name"
                      value={formData.guest_name}
                      onChange={(e) =>
                        setFormData({ ...formData, guest_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest_email">Email *</Label>
                    <Input
                      id="guest_email"
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) =>
                        setFormData({ ...formData, guest_email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest_phone">Telefon</Label>
                    <Input
                      id="guest_phone"
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, guest_phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrival_time">Várható érkezési idő</Label>
                    <Input
                      id="arrival_time"
                      placeholder="pl. 14:00"
                      value={formData.arrival_time}
                      onChange={(e) =>
                        setFormData({ ...formData, arrival_time: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="special_requests">Speciális kérések</Label>
                    <Textarea
                      id="special_requests"
                      value={formData.special_requests}
                      onChange={(e) =>
                        setFormData({ ...formData, special_requests: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={submitting || !dateRange?.from || !dateRange?.to || nights < 1}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Foglalás küldése...
                      </>
                    ) : (
                      'Foglalás küldése'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    A foglalás elküldése után emailben értesítjük a fizetési tudnivalókról.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
