import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RoomCard } from '@/components/guest/RoomCard';
import { PropertyHero } from '@/components/guest/PropertyHero';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';

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

interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  base_price: number;
  min_nights: number;
  amenities: string[];
}

interface RoomImage {
  id: string;
  room_id: string;
  image_url: string;
  sort_order: number;
}

interface PropertyImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export default function Index() {
  const [property, setProperty] = useState<PropertySettings | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomImages, setRoomImages] = useState<Record<string, RoomImage[]>>({});
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch property settings
      const { data: propertyData } = await supabase
        .from('property_settings')
        .select('*')
        .maybeSingle();

      // Fetch property images
      const { data: propImagesData } = await supabase
        .from('property_images')
        .select('*')
        .order('sort_order');

      // Fetch active rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      // Fetch room images
      const { data: roomImagesData } = await supabase
        .from('room_images')
        .select('*')
        .order('sort_order');

      setProperty(propertyData);
      setPropertyImages(propImagesData || []);
      
      const transformedRooms: Room[] = (roomsData || []).map(room => ({
        ...room,
        amenities: Array.isArray(room.amenities) 
          ? (room.amenities as unknown[]).map(a => String(a))
          : [],
      }));
      setRooms(transformedRooms);

      const imagesByRoom: Record<string, RoomImage[]> = {};
      roomImagesData?.forEach((img) => {
        if (!imagesByRoom[img.room_id]) {
          imagesByRoom[img.room_id] = [];
        }
        imagesByRoom[img.room_id].push(img);
      });
      setRoomImages(imagesByRoom);

      setLoading(false);
    }

    fetchData();
  }, []);

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

      {/* Rooms Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-semibold mb-4">
              Szobáink
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Fedezze fel kényelmes szobáinkat és válasszon az igényeinek megfelelőt
            </p>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Hamarosan érkeznek a szobáink!
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room, index) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  images={roomImages[room.id] || []}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>

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
