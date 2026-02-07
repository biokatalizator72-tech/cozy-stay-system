import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, eachDayOfInterval, addMonths } from 'date-fns';
import { hu } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface Room {
  id: string;
  name: string;
  base_price: number;
  min_nights: number;
  is_active: boolean;
}

interface PricingRule {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_nights: number;
}

interface BlockedDate {
  id: string;
  room_id: string;
  blocked_date: string;
  source: string | null;
}

interface DayPricing {
  price: number | null;
  min_nights: number | null;
  ruleId: string | null;
}

export default function AdminPricing() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, { price: string; minNights: string }>>>({});
  const [editedBlocked, setEditedBlocked] = useState<Record<string, Record<string, boolean>>>({});
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: addMonths(new Date(), 1),
  });

  const days = dateRange.from && dateRange.to 
    ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    : [];

  const fetchData = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setLoading(true);
    
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, name, base_price, min_nights, is_active')
      .order('sort_order');

    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const { data: rulesData } = await supabase
      .from('pricing_rules')
      .select('*')
      .gte('end_date', startDate)
      .lte('start_date', endDate);

    const { data: blockedData } = await supabase
      .from('ical_blocked_dates')
      .select('*')
      .gte('blocked_date', startDate)
      .lte('blocked_date', endDate);

    setRooms(roomsData || []);
    setPricingRules(rulesData || []);
    setBlockedDates(blockedData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const isDateBlocked = (roomId: string, dateStr: string): boolean => {
    // Check edited state first
    if (editedBlocked[roomId]?.[dateStr] !== undefined) {
      return editedBlocked[roomId][dateStr];
    }
    // Check database
    return blockedDates.some(b => b.room_id === roomId && b.blocked_date === dateStr);
  };

  const toggleDateBlocked = (roomId: string, dateStr: string) => {
    const currentlyBlocked = isDateBlocked(roomId, dateStr);
    setEditedBlocked(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [dateStr]: !currentlyBlocked,
      },
    }));
  };

  const getPricingForDay = (roomId: string, date: Date): DayPricing => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const rule = pricingRules.find(
      (r) =>
        r.room_id === roomId &&
        r.start_date <= dateStr &&
        r.end_date >= dateStr
    );

    if (rule) {
      return {
        price: rule.price_per_night,
        min_nights: rule.min_nights,
        ruleId: rule.id,
      };
    }

    const room = rooms.find((r) => r.id === roomId);
    return {
      price: room?.base_price || null,
      min_nights: room?.min_nights || null,
      ruleId: null,
    };
  };

  const handlePriceChange = (roomId: string, dateStr: string, field: 'price' | 'minNights', value: string) => {
    setEditedPrices((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [dateStr]: {
          price: prev[roomId]?.[dateStr]?.price || '',
          minNights: prev[roomId]?.[dateStr]?.minNights || '',
          [field]: value,
        },
      },
    }));
  };

  const savePricing = async () => {
    setSaving(true);
    
    try {
      // Save pricing rules
      for (const roomId of Object.keys(editedPrices)) {
        for (const dateStr of Object.keys(editedPrices[roomId])) {
          const { price, minNights } = editedPrices[roomId][dateStr];
          
          if (!price && !minNights) continue;

          const priceNum = price ? parseFloat(price) : null;
          const minNightsNum = minNights ? parseInt(minNights) : 1;

          const existingRule = pricingRules.find(
            (r) =>
              r.room_id === roomId &&
              r.start_date === dateStr &&
              r.end_date === dateStr
          );

          if (existingRule) {
            await supabase
              .from('pricing_rules')
              .update({
                price_per_night: priceNum || existingRule.price_per_night,
                min_nights: minNightsNum,
              })
              .eq('id', existingRule.id);
          } else if (priceNum) {
            await supabase.from('pricing_rules').insert([
              {
                room_id: roomId,
                start_date: dateStr,
                end_date: dateStr,
                price_per_night: priceNum,
                min_nights: minNightsNum,
              },
            ]);
          }
        }
      }

      // Save blocked dates
      for (const roomId of Object.keys(editedBlocked)) {
        for (const dateStr of Object.keys(editedBlocked[roomId])) {
          const shouldBeBlocked = editedBlocked[roomId][dateStr];
          const existingBlock = blockedDates.find(
            b => b.room_id === roomId && b.blocked_date === dateStr
          );

          if (shouldBeBlocked && !existingBlock) {
            await supabase.from('ical_blocked_dates').insert([
              { room_id: roomId, blocked_date: dateStr, source: 'manual' }
            ]);
          } else if (!shouldBeBlocked && existingBlock) {
            await supabase.from('ical_blocked_dates').delete().eq('id', existingBlock.id);
          }
        }
      }

      toast.success('Árak mentve');
      setEditedPrices({});
      setEditedBlocked({});
      fetchData();
    } catch (error) {
      toast.error('Hiba a mentéskor');
    }
    
    setSaving(false);
  };

  const hasChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedBlocked).length > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Árazás</h1>
            <p className="text-muted-foreground mt-1">Szezonális árak és foglalhatóság beállítása</p>
          </div>
          {hasChanges && (
            <Button onClick={savePricing} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Mentés
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "yyyy.MM.dd", { locale: hu })} —{" "}
                            {format(dateRange.to, "yyyy.MM.dd", { locale: hu })}
                          </>
                        ) : (
                          format(dateRange.from, "yyyy.MM.dd", { locale: hu })
                        )
                      ) : (
                        <span>Válasszon időszakot</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range) setDateRange(range);
                      }}
                      numberOfMonths={2}
                      locale={hu}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: new Date(), to: addMonths(new Date(), 1) })}
                >
                  Ma + 1 hónap
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Még nincsenek szobák. Hozzon létre szobákat az árazáshoz.
              </p>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-max">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 sticky left-0 bg-card z-10 min-w-[160px]">
                          Szoba
                        </th>
                        {days.map((day) => (
                          <th key={day.toISOString()} className="p-1 text-center min-w-[56px]">
                            <div className="font-medium text-xs">{format(day, 'd')}</div>
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {format(day, 'EEE', { locale: hu })}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id} className={cn("border-b", !room.is_active && "opacity-50")}>
                          <td className="p-2 sticky left-0 bg-card z-10">
                            <div className="font-medium text-sm">{room.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Alap: {room.base_price.toLocaleString()} Ft
                            </div>
                          </td>
                          {days.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const pricing = getPricingForDay(room.id, day);
                            const edited = editedPrices[room.id]?.[dateStr];
                            const displayPrice = edited?.price || (pricing.price?.toString() ?? '');
                            const displayMinNights = edited?.minNights || (pricing.min_nights?.toString() ?? '');
                            const isEdited = !!edited || editedBlocked[room.id]?.[dateStr] !== undefined;
                            const blocked = isDateBlocked(room.id, dateStr);

                            return (
                              <td
                                key={dateStr}
                                className={cn(
                                  "p-0.5 align-top",
                                  isEdited && "bg-accent/20",
                                  blocked && "bg-destructive/10"
                                )}
                              >
                                <div className="space-y-0.5">
                                  <Input
                                    type="number"
                                    placeholder="Ár"
                                    value={displayPrice}
                                    onChange={(e) =>
                                      handlePriceChange(room.id, dateStr, 'price', e.target.value)
                                    }
                                    className="h-6 text-[11px] text-center px-1 w-[52px]"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    min={1}
                                    value={displayMinNights}
                                    onChange={(e) =>
                                      handlePriceChange(room.id, dateStr, 'minNights', e.target.value)
                                    }
                                    className="h-6 text-[11px] text-center px-1 w-[52px]"
                                  />
                                  <div className="flex items-center justify-center pt-0.5">
                                    <Checkbox
                                      checked={!blocked}
                                      onCheckedChange={() => toggleDateBlocked(room.id, dateStr)}
                                      className="h-3.5 w-3.5"
                                      title={blocked ? "Nem foglalható" : "Foglalható"}
                                    />
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Jelmagyarázat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>Ár:</strong> az adott napi ár Ft-ban</p>
              <p>• <strong>Min:</strong> minimum foglalható éjszakák száma</p>
              <p>• <strong>Checkbox:</strong> ha be van pipálva, a nap foglalható; ha nincs, akkor letiltott</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}