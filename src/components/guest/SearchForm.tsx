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

interface SeasonRange {
  start_date: string;
  end_date: string;
}

interface SearchFormProps {
  maxCapacity: number;
  childAgeBrackets: ChildAgeBracket[];
  seasons: SeasonRange[];
  onSearch: (checkIn: Date, checkOut: Date, guestCounts: GuestCounts) => void;
  isSearching?: boolean;
}

export function SearchForm({ maxCapacity, childAgeBrackets, seasons, onSearch, isSearching }: SearchFormProps) {
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [adults, setAdults] = useState(2);
  const [childCounts, setChildCounts] = useState<Record<string, number>>({});
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkOutMonth, setCheckOutMonth] = useState<Date | undefined>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate the initial month based on the earliest future season
  const seasonStartMonth = (() => {
    if (seasons.length === 0) return today;
    const future = seasons
      .filter(s => new Date(s.end_date + 'T23:59:59') >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    if (future.length === 0) return today;
    const start = new Date(future[0].start_date + 'T00:00:00');
    return start > today ? start : today;
  })();

  const [checkInMonth, setCheckInMonth] = useState<Date | undefined>();

  // Update default month when seasons load
  const effectiveCheckInMonth = checkInMonth ?? seasonStartMonth;

  // Build season date checker
  const isDateInSeason = (date: Date): boolean => {
    if (seasons.length === 0) return true; // no seasons = all dates allowed
    const dateStr = format(date, 'yyyy-MM-dd');
    return seasons.some(s => dateStr >= s.start_date && dateStr <= s.end_date);
  };

  const isDateDisabled = (date: Date): boolean => {
    if (date < today) return true;
    return !isDateInSeason(date);
  };

  const totalChildren = Object.values(childCounts).reduce((sum, count) => sum + count, 0);
  const totalGuests = adults + totalChildren;

  // Build guest summary text for popover trigger
  const guestSummary = (() => {
    const parts: string[] = [`${adults} felnőtt`];
    if (totalChildren > 0) {
      parts.push(`${totalChildren} gyerek`);
    }
    return parts.join(', ');
  })();

  const handleSearch = () => {
    if (checkIn && checkOut) {
      const children = childAgeBrackets.map(bracket => ({
        bracketId: bracket.id,
        count: childCounts[bracket.id] || 0,
      })).filter(c => c.count > 0);
      onSearch(checkIn, checkOut, { adults, children });
    }
  };

  const decrementAdults = () => setAdults((prev) => Math.max(1, prev - 1));
  const incrementAdults = () => { if (totalGuests < maxCapacity) setAdults((prev) => prev + 1); };

  const decrementChild = (bracketId: string) => {
    setChildCounts((prev) => ({ ...prev, [bracketId]: Math.max(0, (prev[bracketId] || 0) - 1) }));
  };
  const incrementChild = (bracketId: string) => {
    if (totalGuests < maxCapacity) {
      setChildCounts((prev) => ({ ...prev, [bracketId]: (prev[bracketId] || 0) + 1 }));
    }
  };

  const isSearchDisabled = !checkIn || !checkOut || isSearching;

  return (
    <Card className="shadow-lg border-0 bg-card/95 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch">
          {/* Check-in */}
          <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal h-12", !checkIn && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn ? format(checkIn, 'MMM d.', { locale: hu }) : 'Érkezés'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={(date) => {
                  setCheckIn(date);
                  setCheckInOpen(false);
                  if (date) {
                    setCheckOutMonth(date);
                  }
                  if (date && checkOut && checkOut <= date) setCheckOut(undefined);
                }}
                disabled={isDateDisabled}
                locale={hu}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Check-out */}
          <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal h-12", !checkOut && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOut ? format(checkOut, 'MMM d.', { locale: hu }) : 'Távozás'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                month={checkOutMonth}
                onMonthChange={setCheckOutMonth}
                onSelect={(date) => {
                  setCheckOut(date);
                  setCheckOutOpen(false);
                }}
                disabled={(date) => {
                  if (date < today) return true;
                  if (checkIn && date <= checkIn) return true;
                  if (!isDateInSeason(date)) return true;
                  return false;
                }}
                locale={hu}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Guest count popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
                <Users className="mr-2 h-4 w-4" />
                {guestSummary}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                {/* Adults */}
                <div className="flex items-center justify-between">
                  <span className="font-medium">Felnőttek</span>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={decrementAdults} disabled={adults <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{adults}</span>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={incrementAdults} disabled={totalGuests >= maxCapacity}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Child brackets */}
                {childAgeBrackets.map((bracket) => (
                  <div key={bracket.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Gyerek</span>
                      <span className="text-sm text-muted-foreground ml-1">({bracket.from_age}-{bracket.to_age} év)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => decrementChild(bracket.id)} disabled={(childCounts[bracket.id] || 0) <= 0}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{childCounts[bracket.id] || 0}</span>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => incrementChild(bracket.id)} disabled={totalGuests >= maxCapacity}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Total indicator */}
                {totalGuests > 0 && (
                  <div className="pt-3 border-t text-center text-sm text-muted-foreground">
                    Összesen: <span className="font-medium text-foreground">{totalGuests} vendég</span>
                    {totalGuests >= maxCapacity && (
                      <span className="ml-2 text-amber-600">(maximum)</span>
                    )}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Search button */}
          <Button
            onClick={handleSearch}
            disabled={isSearchDisabled}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <Search className="mr-2 h-4 w-4" />
            Keresés
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
