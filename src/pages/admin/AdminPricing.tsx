import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { hu } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Room {
  id: string;
  name: string;
  base_price: number;
  min_nights: number;
}

interface PricingRule {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_nights: number;
}

interface DayPricing {
  price: number | null;
  min_nights: number | null;
  ruleId: string | null;
}

export default function AdminPricing() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, { price: string; minNights: string }>>>({});

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const fetchData = async () => {
    setLoading(true);
    
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, name, base_price, min_nights')
      .eq('is_active', true)
      .order('sort_order');

    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data: rulesData } = await supabase
      .from('pricing_rules')
      .select('*')
      .gte('end_date', startDate)
      .lte('start_date', endDate);

    setRooms(roomsData || []);
    setPricingRules(rulesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

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
      for (const roomId of Object.keys(editedPrices)) {
        for (const dateStr of Object.keys(editedPrices[roomId])) {
          const { price, minNights } = editedPrices[roomId][dateStr];
          
          if (!price && !minNights) continue;

          const priceNum = price ? parseFloat(price) : null;
          const minNightsNum = minNights ? parseInt(minNights) : 1;

          // Check if there's an existing rule for this exact day
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

      toast.success('Árak mentve');
      setEditedPrices({});
      fetchData();
    } catch (error) {
      toast.error('Hiba a mentéskor');
    }
    
    setSaving(false);
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Árazás</h1>
            <p className="text-muted-foreground mt-1">Szezonális árak és minimum éjszakák beállítása</p>
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
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="font-display">
                {format(currentMonth, 'yyyy MMMM', { locale: hu })}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
                        <th className="text-left p-2 sticky left-0 bg-card z-10 min-w-[150px]">
                          Szoba
                        </th>
                        {days.map((day) => (
                          <th key={day.toISOString()} className="p-2 text-center min-w-[80px]">
                            <div className="font-medium">{format(day, 'd')}</div>
                            <div className="text-xs text-muted-foreground font-normal">
                              {format(day, 'EEE', { locale: hu })}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id} className="border-b">
                          <td className="p-2 sticky left-0 bg-card z-10">
                            <div className="font-medium">{room.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Alap: {room.base_price.toLocaleString()} Ft
                            </div>
                          </td>
                          {days.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const pricing = getPricingForDay(room.id, day);
                            const edited = editedPrices[room.id]?.[dateStr];
                            const displayPrice = edited?.price || (pricing.price?.toString() ?? '');
                            const displayMinNights = edited?.minNights || (pricing.min_nights?.toString() ?? '');
                            const isEdited = !!edited;

                            return (
                              <td
                                key={dateStr}
                                className={`p-1 ${isEdited ? 'bg-accent/20' : ''}`}
                              >
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    placeholder="Ár"
                                    value={displayPrice}
                                    onChange={(e) =>
                                      handlePriceChange(room.id, dateStr, 'price', e.target.value)
                                    }
                                    className="h-7 text-xs text-center"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    min={1}
                                    value={displayMinNights}
                                    onChange={(e) =>
                                      handlePriceChange(room.id, dateStr, 'minNights', e.target.value)
                                    }
                                    className="h-7 text-xs text-center"
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
            <CardTitle className="font-display text-lg">Tipp</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Az első mezőbe az adott napi árat, a másodikba a minimum foglalható éjszakák számát írja be.
              Ha üresen hagyja, az alapár és minimum éjszakák számát használja a rendszer.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
