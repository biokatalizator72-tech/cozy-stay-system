import { useState } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { CalendarIcon, Search, Users, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SearchFormProps {
  maxCapacity: number;
  onSearch: (checkIn: Date, checkOut: Date, guests: number) => void;
  isSearching?: boolean;
}

export function SearchForm({ maxCapacity, onSearch, isSearching }: SearchFormProps) {
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState(2);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSearch = () => {
    if (checkIn && checkOut) {
      onSearch(checkIn, checkOut, guests);
    }
  };

  const decrementGuests = () => {
    setGuests((prev) => Math.max(1, prev - 1));
  };

  const incrementGuests = () => {
    setGuests((prev) => Math.min(maxCapacity, prev + 1));
  };

  const isSearchDisabled = !checkIn || !checkOut || isSearching;

  return (
    <Card className="shadow-lg border-0 bg-card/95 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Check-in date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Érkezés</label>
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !checkIn && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkIn ? format(checkIn, 'MMM d.', { locale: hu }) : 'Válasszon dátumot'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={(date) => {
                    setCheckIn(date);
                    setCheckInOpen(false);
                    // Clear check-out if it's before new check-in
                    if (date && checkOut && checkOut <= date) {
                      setCheckOut(undefined);
                    }
                  }}
                  disabled={(date) => date < today}
                  locale={hu}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Check-out date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Távozás</label>
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !checkOut && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkOut ? format(checkOut, 'MMM d.', { locale: hu }) : 'Válasszon dátumot'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={(date) => {
                    setCheckOut(date);
                    setCheckOutOpen(false);
                  }}
                  disabled={(date) => {
                    if (date < today) return true;
                    if (checkIn && date <= checkIn) return true;
                    return false;
                  }}
                  locale={hu}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Guest count */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Vendégek</label>
            <div className="flex items-center h-12 border rounded-md px-3 bg-background">
              <Users className="h-4 w-4 text-muted-foreground mr-2" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={decrementGuests}
                disabled={guests <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex-1 text-center font-medium">{guests} fő</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={incrementGuests}
                disabled={guests >= maxCapacity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search button */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-transparent md:block hidden">Keresés</label>
            <Button
              onClick={handleSearch}
              disabled={isSearchDisabled}
              className="w-full h-12"
              size="lg"
            >
              <Search className="mr-2 h-4 w-4" />
              Szabad szobák keresése
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
