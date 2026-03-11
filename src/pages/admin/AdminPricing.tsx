import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, eachDayOfInterval, addMonths, getDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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

const DAY_LABELS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

export default function AdminPricing() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<{ id: string; room_type_id: string | null }[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [availability, setAvailability] = useState<RoomTypeAvailability[]>([]);
  const [seasons, setSeasons] = useState<{ start_date: string; end_date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, { price: string; minNights: string }>>>({});
  const [editedAvailability, setEditedAvailability] = useState<Record<string, Record<string, string>>>({});
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: addMonths(new Date(), 1),
  });

  // Bulk fill state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkRoomTypeId, setBulkRoomTypeId] = useState<string | null>(null);
  const [bulkDateFrom, setBulkDateFrom] = useState<Date | undefined>(undefined);
  const [bulkDateTo, setBulkDateTo] = useState<Date | undefined>(undefined);
  const [bulkDays, setBulkDays] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkMinNights, setBulkMinNights] = useState('');
  const [bulkCapacity, setBulkCapacity] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [depositPercent, setDepositPercent] = useState<number>(50);

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

    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, room_type_id');

    const { data: settingsData } = await supabase
      .from('property_settings')
      .select('deposit_percent')
      .maybeSingle();

    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('start_date, end_date')
      .eq('is_active', true)
      .order('start_date');

    setRoomTypes(roomTypesData || []);
    setRooms(roomsData || []);
    setPricingRules(rulesData || []);
    setAvailability(availabilityData || []);
    setSeasons(seasonsData || []);
    if (settingsData?.deposit_percent != null) {
      setDepositPercent(settingsData.deposit_percent);
    }
    setLoading(false);
  };

  const isDateInSeason = (dateStr: string): boolean => {
    if (seasons.length === 0) return true;
    return seasons.some(s => dateStr >= s.start_date && dateStr <= s.end_date);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const getAvailabilityCount = (roomTypeId: string, dateStr: string): number => {
    if (editedAvailability[roomTypeId]?.[dateStr] !== undefined) {
      return parseInt(editedAvailability[roomTypeId][dateStr]) || 0;
    }
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
            const roomId = rooms.find(r => r.room_type_id === roomTypeId)?.id;
            if (!roomId) {
              console.error('No room found for room_type_id:', roomTypeId);
              continue;
            }
            await supabase.from('pricing_rules').insert([
              {
                room_id: roomId,
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
      console.error('Pricing save error:', error);
      toast.error('Hiba a mentéskor');
    }
    
    setSaving(false);
  };

  const hasChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedAvailability).length > 0;

  // Bulk fill functions
  const openBulkDialog = (roomTypeId: string) => {
    setBulkRoomTypeId(roomTypeId);
    setBulkDateFrom(dateRange.from);
    setBulkDateTo(dateRange.to);
    setBulkDays([true, true, true, true, true, true, true]);
    setBulkPrice('');
    setBulkMinNights('');
    setBulkCapacity('');
    setBulkDialogOpen(true);
  };

  const saveBulk = async () => {
    if (!bulkRoomTypeId || !bulkDateFrom || !bulkDateTo) return;
    if (!bulkPrice && !bulkMinNights && !bulkCapacity) {
      toast.error('Legalább egy mezőt ki kell tölteni');
      return;
    }

    setBulkSaving(true);
    try {
      const allDays = eachDayOfInterval({ start: bulkDateFrom, end: bulkDateTo });
      
      for (const day of allDays) {
        // getDay: 0=Sunday, 1=Monday ... 6=Saturday
        // bulkDays: [Mon, Tue, Wed, Thu, Fri, Sat, Sun] = indices 0-6
        const jsDay = getDay(day); // 0=Sun, 1=Mon...6=Sat
        const bulkIndex = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0...Sun=6
        
        if (!bulkDays[bulkIndex]) continue;

        const dateStr = format(day, 'yyyy-MM-dd');

        // Upsert pricing_rules if price or minNights given
        if (bulkPrice || bulkMinNights) {
          const priceNum = bulkPrice ? parseFloat(bulkPrice) : null;
          const minNightsNum = bulkMinNights ? parseInt(bulkMinNights) : null;

          const existingRule = pricingRules.find(
            r => r.room_type_id === bulkRoomTypeId && r.start_date === dateStr && r.end_date === dateStr
          );

          if (existingRule) {
            const updateData: Record<string, number> = {};
            if (priceNum) updateData.price_per_night = priceNum;
            if (minNightsNum) updateData.min_nights = minNightsNum;
            await supabase.from('pricing_rules').update(updateData).eq('id', existingRule.id);
          } else {
            const roomType = roomTypes.find(rt => rt.id === bulkRoomTypeId);
            const effectivePrice = priceNum || roomType?.base_price || 0;
            const roomId = rooms.find(r => r.room_type_id === bulkRoomTypeId)?.id;
            if (!roomId) {
              console.error('No room found for room_type_id:', bulkRoomTypeId);
              continue;
            }
            await supabase.from('pricing_rules').insert([{
              room_id: roomId,
              room_type_id: bulkRoomTypeId,
              start_date: dateStr,
              end_date: dateStr,
              price_per_night: effectivePrice,
              min_nights: minNightsNum || 1,
            }]);
          }
        }

        // Upsert room_type_availability if capacity given
        if (bulkCapacity) {
          const count = parseInt(bulkCapacity);
          const existingAvail = availability.find(
            a => a.room_type_id === bulkRoomTypeId && a.date === dateStr
          );

          if (existingAvail) {
            await supabase.from('room_type_availability').update({ available_count: count }).eq('id', existingAvail.id);
          } else {
            await supabase.from('room_type_availability').insert([{
              room_type_id: bulkRoomTypeId,
              date: dateStr,
              available_count: count,
            }]);
          }
        }
      }

      toast.success('Tömeges kitöltés mentve');
      setBulkDialogOpen(false);
      setEditedPrices({});
      setEditedAvailability({});
      fetchData();
    } catch (error) {
      console.error('Bulk save error:', error);
      toast.error('Hiba a mentéskor');
    }
    setBulkSaving(false);
  };

  const bulkRoomType = roomTypes.find(rt => rt.id === bulkRoomTypeId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Ártábla</h1>
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
                            <button
                              type="button"
                              className="text-[10px] text-blue-600 hover:underline cursor-pointer mt-0.5"
                              onClick={() => openBulkDialog(roomType.id)}
                            >
                              tömeges kitöltés
                            </button>
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
                            const offSeason = !isDateInSeason(dateStr);

                            return (
                              <td
                                key={dateStr}
                                className={cn(
                                  "p-0.5 align-top",
                                  offSeason && "bg-muted/50 opacity-50",
                                  isEdited && !offSeason && "bg-accent/20",
                                  isUnavailable && !isEdited && !offSeason && "bg-destructive/10"
                                )}
                                title={offSeason ? 'Szezonon kívüli nap' : undefined}
                              >
                                <div className="space-y-0.5">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Ár"
                                    value={displayPrice}
                                    onChange={(e) =>
                                      handlePriceChange(roomType.id, dateStr, 'price', e.target.value.replace(/[^0-9]/g, ''))
                                    }
                                    className="h-6 text-[11px] text-center px-1 w-[60px]"
                                  />
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Min"
                                    value={displayMinNights}
                                    onChange={(e) =>
                                      handlePriceChange(roomType.id, dateStr, 'minNights', e.target.value.replace(/[^0-9]/g, ''))
                                    }
                                    className="h-6 text-[11px] text-center px-1 w-[60px]"
                                  />
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Db"
                                    value={displayAvail}
                                    onChange={(e) =>
                                      handleAvailabilityChange(roomType.id, dateStr, e.target.value.replace(/[^0-9]/g, ''))
                                    }
                                    className={cn(
                                      "h-6 text-[11px] text-center px-1 w-[60px]",
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
            <CardTitle className="font-display text-lg">Előleg mértéke</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Előleg százalék:</span>
              <Select
                value={depositPercent.toString()}
                onValueChange={async (val) => {
                  const newPercent = parseInt(val);
                  setDepositPercent(newPercent);
                  const { error } = await supabase
                    .from('property_settings')
                    .update({ deposit_percent: newPercent })
                    .neq('id', '00000000-0000-0000-0000-000000000000');
                  if (error) {
                    toast.error('Hiba az előleg mentésekor');
                  } else {
                    toast.success(`Előleg: ${newPercent}%`);
                  }
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

      {/* Bulk fill dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tömeges kitöltés{bulkRoomType ? ` – ${bulkRoomType.name}` : ''}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mettől</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {bulkDateFrom ? format(bulkDateFrom, 'yyyy.MM.dd', { locale: hu }) : 'Válassz...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bulkDateFrom}
                      onSelect={setBulkDateFrom}
                      locale={hu}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meddig</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {bulkDateTo ? format(bulkDateTo, 'yyyy.MM.dd', { locale: hu }) : 'Válassz...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bulkDateTo}
                      onSelect={setBulkDateTo}
                      locale={hu}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Day checkboxes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Napok</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {DAY_LABELS.map((label, i) => (
                  <label key={label} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={bulkDays[i]}
                      onCheckedChange={(checked) => {
                        const next = [...bulkDays];
                        next[i] = !!checked;
                        setBulkDays(next);
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kapacitás (db)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={bulkCapacity}
                  onChange={e => setBulkCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ár (HUF)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={bulkPrice}
                  onChange={e => setBulkPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min. éjszaka</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="—"
                  value={bulkMinNights}
                  onChange={e => setBulkMinNights(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Mégsem</Button>
            <Button onClick={saveBulk} disabled={bulkSaving}>
              {bulkSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
