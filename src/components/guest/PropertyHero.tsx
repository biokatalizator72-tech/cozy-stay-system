import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import defaultHeroImage from '@/assets/hero-hotel.jpg';

interface PropertyHeroProps {
  name: string;
  description: string | null;
  images: Array<{ id: string; image_url: string }>;
}

export function PropertyHero({ name, description, images }: PropertyHeroProps) {
  const [currentImage, setCurrentImage] = useState(0);
  
  const displayImages = images.length > 0 
    ? images 
    : [{ id: 'default', image_url: defaultHeroImage }];

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <section className="relative min-h-[60vh] lg:min-h-[70vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero">
        <img
          src={displayImages[currentImage].image_url}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/40" />
      </div>

      {displayImages.length > 1 && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
          <Button variant="secondary" size="icon" onClick={prevImage} className="pointer-events-auto opacity-70 hover:opacity-100">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="icon" onClick={nextImage} className="pointer-events-auto opacity-70 hover:opacity-100">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div className="container relative z-10 text-center text-primary-foreground">
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up">{name}</h1>
        {description && (
          <p className="text-lg lg:text-xl opacity-90 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {description}
          </p>
        )}
        <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button size="lg" variant="secondary" className="font-medium shadow-lg hover:shadow-xl transition-shadow">
            Szobáink megtekintése
          </Button>
        </div>
      </div>

      {displayImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`w-2 h-2 rounded-full transition-all ${index === currentImage ? 'bg-primary-foreground w-6' : 'bg-primary-foreground/50'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
