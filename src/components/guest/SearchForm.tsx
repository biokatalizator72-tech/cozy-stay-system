import { useState } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { CalendarIcon, Search, Users, Minus, Plus, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ChildAgeBracket {
  id: string;
  from_age: number;
  to_age: number;
  discount_percent: number;
  sort_order: number;
}

export interface GuestCounts {
  adults: number;
  children: { bracketId: string; count: number }[];
}

interface SearchFormProps {
  maxCapacity: number;
  childAgeBrackets: ChildAgeBracket[];
  onSearch: (checkIn: Date, checkOut: Date, guestCounts: GuestCounts) => void;
  isSearching?: boolean;
}

export function SearchForm({ maxCapacity, childAgeBrackets, onSearch, isSearching }: SearchFormProps) {
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [adults, setAdults] = useState(2);
  const [childCounts, setChildCounts] = useState<Record<string, number>>({});
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate total guests
  const totalChildren = Object.values(childCounts).reduce((sum, count) => sum + count, 0);
  const totalGuests = adults + totalChildren;

  const handleSearch = () => {
    if (checkIn && checkOut) {
      const children = childAgeBrackets.map(bracket => ({
        bracketId: bracket.id,
        count: childCounts[bracket.id] || 0,
      })).filter(c => c.count > 0);
      
      onSearch(checkIn, checkOut, { adults, children });
    }
  };

  const decrementAdults = () => {
    setAdults((prev) => Math.max(1, prev - 1));
  };

  const incrementAdults = () => {
    if (totalGuests < maxCapacity) {
      setAdults((prev) => prev + 1);
    }
  };

  const decrementChild = (bracketId: string) => {
    setChildCounts((prev) => ({
      ...prev,
      [bracketId]: Math.max(0, (prev[bracketId] || 0) - 1),
    }));
  };

  const incrementChild = (bracketId: string) => {
    if (totalGuests < maxCapacity) {
      setChildCounts((prev) => ({
        ...prev,
        [bracketId]: (prev[bracketId] || 0) + 1,
      }));
    }
  };

  const isSearchDisabled = !checkIn || !checkOut || isSearching;

  return (
    <Card className="shadow-lg border-0 bg-card/95 backdrop-blur-sm">
      <CardContent className="p-6">
        {/* Row 1: Dates and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

        {/* Row 2: Guest counts */}
        <div className={cn(
          "grid gap-4",
          childAgeBrackets.length === 0 
            ? "grid-cols-1" 
            : childAgeBrackets.length === 1 
              ? "grid-cols-1 md:grid-cols-2" 
              : `grid-cols-1 md:grid-cols-${Math.min(childAgeBrackets.length + 1, 4)}`
        )}>
          {/* Adults counter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Felnőttek</label>
            <div className="flex items-center h-12 border rounded-md px-3 bg-background">
              <Users className="h-4 w-4 text-muted-foreground mr-2" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={decrementAdults}
                disabled={adults <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex-1 text-center font-medium">{adults} fő</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={incrementAdults}
                disabled={totalGuests >= maxCapacity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Child counters - dynamically generated from child_age_brackets */}
          {childAgeBrackets.map((bracket) => (
            <div key={bracket.id} className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Gyerek ({bracket.from_age}-{bracket.to_age} éves)
              </label>
              <div className="flex items-center h-12 border rounded-md px-3 bg-background">
                <Baby className="h-4 w-4 text-muted-foreground mr-2" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => decrementChild(bracket.id)}
                  disabled={(childCounts[bracket.id] || 0) <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="flex-1 text-center font-medium">{childCounts[bracket.id] || 0} fő</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => incrementChild(bracket.id)}
                  disabled={totalGuests >= maxCapacity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Total guests indicator */}
        {totalGuests > 0 && (
          <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
            Összesen: <span className="font-medium text-foreground">{totalGuests} vendég</span>
            {totalGuests >= maxCapacity && (
              <span className="ml-2 text-amber-600">(maximum kapacitás)</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
