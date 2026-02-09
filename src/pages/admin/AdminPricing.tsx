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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface RoomType {
  id: string;
  name: string;
  base_price: number;
  is_active: boolean;
}

interface PricingRule {
  id: string;
  room_type_id: string | null;
  room_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_nights: number;
}

interface RoomTypeAvailability {
  id: string;
  room_type_id: string;
  date: string;
  available_count: number;
}

interface DayPricing {
  price: number | null;
  min_nights: number | null;
  ruleId: string | null;
}

export default function AdminPricing() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [availability, setAvailability] = useState<RoomTypeAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, { price: string; minNights: string }>>>({});
  const [editedAvailability, setEditedAvailability] = useState<Record<string, Record<string, string>>>({});
  
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
    
    const { data: roomTypesData } = await supabase
      .from('room_types')
      .select('id, name, base_price, is_active')
      .order('sort_order');

    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const { data: rulesData } = await supabase
      .from('pricing_rules')
      .select('*')
      .gte('end_date', startDate)
      .lte('start_date', endDate);

    const { data: availabilityData } = await supabase
      .from('room_type_availability')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    setRoomTypes(roomTypesData || []);
    setPricingRules(rulesData || []);
    setAvailability(availabilityData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const getAvailabilityCount = (roomTypeId: string, dateStr: string): number => {
    // Check edited state first
    if (editedAvailability[roomTypeId]?.[dateStr] !== undefined) {
      return parseInt(editedAvailability[roomTypeId][dateStr]) || 0;
    }
    // Check database
    const avail = availability.find(a => a.room_type_id === roomTypeId && a.date === dateStr);
    return avail?.available_count ?? 0;
  };

  const handleAvailabilityChange = (roomTypeId: string, dateStr: string, value: string) => {
    setEditedAvailability(prev => ({
      ...prev,
      [roomTypeId]: {
        ...prev[roomTypeId],
        [dateStr]: value,
      },
    }));
  };

  const getPricingForDay = (roomTypeId: string, date: Date): DayPricing => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const rule = pricingRules.find(
      (r) =>
        r.room_type_id === roomTypeId &&
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

    const roomType = roomTypes.find((r) => r.id === roomTypeId);
    return {
      price: roomType?.base_price || null,
      min_nights: 1,
      ruleId: null,
    };
  };

  const handlePriceChange = (roomTypeId: string, dateStr: string, field: 'price' | 'minNights', value: string) => {
    setEditedPrices((prev) => ({
      ...prev,
      [roomTypeId]: {
        ...prev[roomTypeId],
        [dateStr]: {
          price: prev[roomTypeId]?.[dateStr]?.price || '',
          minNights: prev[roomTypeId]?.[dateStr]?.minNights || '',
          [field]: value,
        },
      },
    }));
  };

  const savePricing = async () => {
    setSaving(true);
    
    try {
      // Save pricing rules
      for (const roomTypeId of Object.keys(editedPrices)) {
        for (const dateStr of Object.keys(editedPrices[roomTypeId])) {
          const { price, minNights } = editedPrices[roomTypeId][dateStr];
          
          if (!price && !minNights) continue;

          const priceNum = price ? parseFloat(price) : null;
          const minNightsNum = minNights ? parseInt(minNights) : 1;

          const existingRule = pricingRules.find(
            (r) =>
              r.room_type_id === roomTypeId &&
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
                room_id: roomTypeId, // Keep for backward compatibility
                room_type_id: roomTypeId,
                start_date: dateStr,
                end_date: dateStr,
                price_per_night: priceNum,
                min_nights: minNightsNum,
              },
            ]);
          }
        }
      }

      // Save availability
      for (const roomTypeId of Object.keys(editedAvailability)) {
        for (const dateStr of Object.keys(editedAvailability[roomTypeId])) {
          const availableCount = parseInt(editedAvailability[roomTypeId][dateStr]) || 0;
          const existingAvail = availability.find(
            a => a.room_type_id === roomTypeId && a.date === dateStr
          );

          if (existingAvail) {
            await supabase
              .from('room_type_availability')
              .update({ available_count: availableCount })
              .eq('id', existingAvail.id);
          } else {
            await supabase.from('room_type_availability').insert([
              { room_type_id: roomTypeId, date: dateStr, available_count: availableCount }
            ]);
          }
        }
      }

      toast.success('Árak és elérhetőség mentve');
      setEditedPrices({});
      setEditedAvailability({});
      fetchData();
    } catch (error) {
      toast.error('Hiba a mentéskor');
    }
    
    setSaving(false);
  };

  const hasChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedAvailability).length > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Árazás</h1>
            <p className="text-muted-foreground mt-1">Szobatípusonkénti árak és elérhetőség</p>
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
            ) : roomTypes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Még nincsenek szobatípusok. Hozzon létre szobatípusokat az árazáshoz.
              </p>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-max">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 sticky left-0 bg-card z-10 min-w-[160px]">
                          Szobatípus
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
                      {roomTypes.map((roomType) => (
                        <tr key={roomType.id} className={cn("border-b", !roomType.is_active && "opacity-50")}>
                          <td className="p-2 sticky left-0 bg-card z-10">
                            <div className="font-medium text-sm">{roomType.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Alap: {roomType.base_price.toLocaleString()} Ft
                            </div>
                          </td>
                          {days.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const pricing = getPricingForDay(roomType.id, day);
                            const edited = editedPrices[roomType.id]?.[dateStr];
                            const displayPrice = edited?.price || (pricing.price?.toString() ?? '');
                            const displayMinNights = edited?.minNights || (pricing.min_nights?.toString() ?? '');
                            const availCount = getAvailabilityCount(roomType.id, dateStr);
                            const editedAvail = editedAvailability[roomType.id]?.[dateStr];
                            const displayAvail = editedAvail !== undefined ? editedAvail : availCount.toString();
                            const isEdited = !!edited || editedAvail !== undefined;
                            const isUnavailable = parseInt(displayAvail) === 0;

                            return (
                              <td
                                key={dateStr}
                                className={cn(
                                  "p-0.5 align-top",
                                  isEdited && "bg-accent/20",
                                  isUnavailable && !isEdited && "bg-destructive/10"
                                )}
                              >
                                <div className="space-y-0.5">
                                  <Input
                                    type="number"
                                    placeholder="Ár"
                                    value={displayPrice}
                                    onChange={(e) =>
                                      handlePriceChange(roomType.id, dateStr, 'price', e.target.value)
                                    }
                                    className="h-6 text-[11px] text-center px-1 w-[52px]"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    min={1}
                                    value={displayMinNights}
                                    onChange={(e) =>
                                      handlePriceChange(roomType.id, dateStr, 'minNights', e.target.value)
                                    }
                                    className="h-6 text-[11px] text-center px-1 w-[52px]"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Db"
                                    min={0}
                                    max={99}
                                    value={displayAvail}
                                    onChange={(e) =>
                                      handleAvailabilityChange(roomType.id, dateStr, e.target.value)
                                    }
                                    className={cn(
                                      "h-6 text-[11px] text-center px-1 w-[52px]",
                                      isUnavailable && "border-destructive text-destructive"
                                    )}
                                    title="Elérhető szobák száma"
                                  />
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
              <p>• <strong>Db:</strong> elérhető szobák száma az adott szobatípusból (0 = nem foglalható)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
