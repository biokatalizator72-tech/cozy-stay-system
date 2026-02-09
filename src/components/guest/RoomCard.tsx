import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronLeft, ChevronRight, Bed, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/supabase-helpers';
import { format } from 'date-fns';

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
  sort_order: number;
}

interface ChildCount {
  bracketId: string;
  count: number;
}

interface RoomCardProps {
  room: RoomType;
  images: RoomTypeImage[];
  index: number;
  checkIn?: Date;
  checkOut?: Date;
  adults?: number;
  children?: ChildCount[];
  totalPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  nights?: number;
}

export function RoomCard({ room, images, index, checkIn, checkOut, adults, children, totalPrice, originalPrice, discountPercent, nights }: RoomCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const hasImages = images.length > 0;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  // Build booking URL with optional query params
  const buildBookingUrl = () => {
    let url = `/book/${room.id}`;
    const params = new URLSearchParams();
    
    if (checkIn) {
      params.set('checkIn', format(checkIn, 'yyyy-MM-dd'));
    }
    if (checkOut) {
      params.set('checkOut', format(checkOut, 'yyyy-MM-dd'));
    }
    if (adults) {
      params.set('adults', adults.toString());
    }
    if (children && children.length > 0) {
      params.set('children', JSON.stringify(children));
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  };

  return (
    <Card 
      className="overflow-hidden group animate-slide-up hover:shadow-xl transition-all duration-300"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Image carousel */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {hasImages ? (
          <>
            <img
              src={images[currentImage].image_url}
              alt={room.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {images.length > 1 && (
              <>
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentImage ? 'bg-white w-4' : 'bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bed className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Capacity badge */}
        <Badge className="absolute top-3 right-3 bg-background/90 text-foreground">
          <Users className="h-3 w-3 mr-1" />
          {room.capacity} fő
        </Badge>
      </div>

      <CardContent className="p-5">
        <h3 className="font-display text-xl font-semibold mb-2">{room.name}</h3>
        
        {room.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {room.description}
          </p>
        )}

        {/* Amenities */}
        {room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {room.amenities.slice(0, 4).map((amenity, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                {amenity}
              </Badge>
            ))}
            {room.amenities.length > 4 && (
              <Badge variant="secondary" className="text-xs font-normal">
                +{room.amenities.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {discountPercent && discountPercent > 0 && originalPrice ? (
              <>
                <Badge className="bg-accent text-accent-foreground text-xs font-semibold mb-1">
                  -{discountPercent}%
                </Badge>
                <div className="text-sm text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(totalPrice ?? room.base_price)}
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold text-primary">
                {formatPrice(totalPrice ?? room.base_price)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {totalPrice != null && nights ? `${nights} éjszaka összesen` : '/ éjszaka'}
            </div>
          </div>
          <Link to={buildBookingUrl()}>
            <Button className="group/btn">
              Foglalás
              <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
