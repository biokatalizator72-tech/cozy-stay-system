import { Fragment, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, eachDayOfInterval, addMonths, getDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
}

interface DayPricing {
  price: number | null;
  min_nights: number | null;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  ruleId: string | null;
}

const DAY_LABELS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

export default function AdminPricing() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<{ id: string; room_type_id: string | null }[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [seasons, setSeasons] = useState<{ start_date: string; end_date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, { price: string; minNights: string }>>>({});
  const [editedRestrictions, setEditedRestrictions] = useState<Record<string, Record<string, { closedArrival?: boolean; closedDeparture?: boolean }>>>({});
  const [showRestrictions, setShowRestrictions] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [initialDateRangeSet, setInitialDateRangeSet] = useState(false);

  // Bulk fill state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkRoomTypeId, setBulkRoomTypeId] = useState<string | null>(null);
  const [bulkDateFrom, setBulkDateFrom] = useState<Date | undefined>(undefined);
  const [bulkDateTo, setBulkDateTo] = useState<Date | undefined>(undefined);
  const [bulkDays, setBulkDays] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkMinNights, setBulkMinNights] = useState('');
  const [bulkClosedArrival, setBulkClosedArrival] = useState(false);
  const [bulkClosedDeparture, setBulkClosedDeparture] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [depositPercent, setDepositPercent] = useState<number>(50);

  const days = dateRange?.from && dateRange?.to
    ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    : [];

  // Hány konkrét szoba tartozik az adott szobatípushoz (a "Szobák" admin
  // oldalon felvitt rooms sorokból számolva) — ez a tényleges, foglalható
  // szoba-darabszám, ami a napi elérhetőséget vezérli a check-availability
  // / create-booking függvényekben. Itt csak megjelenítjük, nem
  // szerkeszthető: a szobák hozzáadása/törlése a "Szobák" oldalon történik.
  const roomCountByType = rooms.reduce<Record<string, number>>((acc, r) => {
    if (!r.room_type_id) return acc;
    acc[r.room_type_id] = (acc[r.room_type_id] || 0) + 1;
    return acc;
  }, {});

  // First effect: fetch seasons and set initial date range
  useEffect(() => {
    const initDateRange = async () => {
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('start_date, end_date')
        .eq('is_active', true)
        .order('start_date');

      const loadedSeasons = seasonsData || [];
      setSeasons(loadedSeasons);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let startDate = today;
      if (loadedSeasons.length > 0) {
        const future = loadedSeasons
          .filter(s => new Date(s.end_date + 'T23:59:59') >= today)
          .sort((a, b) => a.start_date.localeCompare(b.start_date));
        if (future.length > 0) {
          const seasonStart = new Date(future[0].start_date + 'T00:00:00');
          if (seasonStart > today) startDate = seasonStart;
        }
      }

      setDateRange({ from: startDate, to: addMonths(startDate, 1) });
      setInitialDateRangeSet(true);
    };
    initDateRange();
  }, []);

  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

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

    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, room_type_id');

    const { data: settingsData } = await supabase
      .from('property_settings')
      .select('deposit_percent')
      .maybeSingle();

    setRoomTypes(roomTypesData || []);
    setRooms(roomsData || []);
    setPricingRules(rulesData || []);
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
    if (initialDateRangeSet) fetchData();
  }, [dateRange, initialDateRangeSet]);

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
        closed_to_arrival: !!rule.closed_to_arrival,
        closed_to_departure: !!rule.closed_to_departure,
        ruleId: rule.id,
      };
    }

    const roomType = roomTypes.find((r) => r.id === roomTypeId);
    return {
      price: roomType?.base_price || null,
      min_nights: 1,
      closed_to_arrival: false,
      closed_to_departure: false,
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

  const handleRestrictionChange = (
    roomTypeId: string,
    dateStr: string,
    field: 'closedArrival' | 'closedDeparture',
    value: boolean
  ) => {
    setEditedRestrictions((prev) => ({
      ...prev,
      [roomTypeId]: {
        ...prev[roomTypeId],
        [dateStr]: {
          ...prev[roomTypeId]?.[dateStr],
          [field]: value,
        },
      },
    }));
  };

  const savePricing = async () => {
    setSaving(true);

    try {
      // Egyesítjük az ár/min. éjszaka és a korlátozás-szerkesztéseket
      // szobatípus+nap szerint, hogy egy naphoz csak egy pricing_rules
      // sor íródjon, akármelyik mezőt is módosította az admin.
      const touched: Record<string, Set<string>> = {};
      const mark = (roomTypeId: string, dateStr: string) => {
        (touched[roomTypeId] ||= new Set()).add(dateStr);
      };
      Object.entries(editedPrices).forEach(([rtId, dates]) => {
        Object.keys(dates).forEach((d) => mark(rtId, d));
      });
      Object.entries(editedRestrictions).forEach(([rtId, dates]) => {
        Object.keys(dates).forEach((d) => mark(rtId, d));
      });

      for (const roomTypeId of Object.keys(touched)) {
        for (const dateStr of touched[roomTypeId]) {
          const priceEdit = editedPrices[roomTypeId]?.[dateStr];
          const restrictionEdit = editedRestrictions[roomTypeId]?.[dateStr];

          const priceNum = priceEdit?.price ? parseFloat(priceEdit.price) : null;
          const minNightsNum = priceEdit?.minNights ? parseInt(priceEdit.minNights) : null;

          const existingRule = pricingRules.find(
            (r) =>
              r.room_type_id === roomTypeId &&
              r.start_date === dateStr &&
              r.end_date === dateStr
          );

          if (existingRule) {
            const updateData: Record<string, number | boolean> = {};
            if (priceNum != null) updateData.price_per_night = priceNum;
            if (minNightsNum != null) updateData.min_nights = minNightsNum;
            if (restrictionEdit?.closedArrival !== undefined) updateData.closed_to_arrival = restrictionEdit.closedArrival;
            if (restrictionEdit?.closedDeparture !== undefined) updateData.closed_to_departure = restrictionEdit.closedDeparture;

            if (Object.keys(updateData).length > 0) {
              await supabase.from('pricing_rules').update(updateData).eq('id', existingRule.id);
            }
          } else {
            const roomId = rooms.find(r => r.room_type_id === roomTypeId)?.id;
            if (!roomId) {
              console.error('No room found for room_type_id:', roomTypeId);
              continue;
            }
            const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
            await supabase.from('pricing_rules').insert([
              {
                room_id: roomId,
                room_type_id: roomTypeId,
                start_date: dateStr,
                end_date: dateStr,
                price_per_night: priceNum ?? roomType?.base_price ?? 0,
                min_nights: minNightsNum ?? 1,
                closed_to_arrival: restrictionEdit?.closedArrival ?? false,
                closed_to_departure: restrictionEdit?.closedDeparture ?? false,
              },
            ]);
          }
        }
      }

      toast.success('Árak és korlátozások mentve');
      setEditedPrices({});
      setEditedRestrictions({});
      fetchData();
    } catch (error) {
      console.error('Pricing save error:', error);
      toast.error('Hiba a mentéskor');
    }

    setSaving(false);
  };

  const hasChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedRestrictions).length > 0;

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Tab') return;
    const target = e.currentTarget;
    const row = target.dataset.row;
    const col = target.dataset.col;
    const field = target.dataset.field;
    if (!row || !col || !field) return;

    const colIdx = days.findIndex((d) => format(d, 'yyyy-MM-dd') === col);
    const rowIdx = roomTypes.findIndex((rt) => rt.id === row);
    if (colIdx === -1 || rowIdx === -1) return;

    let nextRowIdx = rowIdx;
    let nextColIdx = colIdx + (e.shiftKey ? -1 : 1);

    if (nextColIdx >= days.length) {
      nextColIdx = 0;
      nextRowIdx = rowIdx + 1;
    } else if (nextColIdx < 0) {
      nextColIdx = days.length - 1;
      nextRowIdx = rowIdx - 1;
    }

    if (nextRowIdx < 0 || nextRowIdx >= roomTypes.length) return;

    e.preventDefault();
    const nextRow = roomTypes[nextRowIdx].id;
    const nextCol = format(days[nextColIdx], 'yyyy-MM-dd');
    const selector = `input[data-row="${nextRow}"][data-col="${nextCol}"][data-field="${field}"]`;
    const el = document.querySelector<HTMLInputElement>(selector);
    if (el) {
      el.focus();
      el.select();
    }
  };

  // Bulk fill functions
  const openBulkDialog = (roomTypeId: string) => {
    setBulkRoomTypeId(roomTypeId);
    setBulkDateFrom(dateRange.from);
    setBulkDateTo(dateRange.to);
    setBulkDays([true, true, true, true, true, true, true]);
    setBulkPrice('');
    setBulkMinNights('');
    setBulkClosedArrival(false);
    setBulkClosedDeparture(false);
    setBulkDialogOpen(true);
  };

  const saveBulk = async () => {
    if (!bulkRoomTypeId || !bulkDateFrom || !bulkDateTo) return;
    const applyRestrictions = showRestrictions && (bulkClosedArrival || bulkClosedDeparture);
    if (!bulkPrice && !bulkMinNights && !applyRestrictions) {
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
        const priceNum = bulkPrice ? parseFloat(bulkPrice) : null;
        const minNightsNum = bulkMinNights ? parseInt(bulkMinNights) : null;

        const existingRule = pricingRules.find(
          r => r.room_type_id === bulkRoomTypeId && r.start_date === dateStr && r.end_date === dateStr
        );

        if (existingRule) {
          const updateData: Record<string, number | boolean> = {};
          if (priceNum != null) updateData.price_per_night = priceNum;
          if (minNightsNum != null) updateData.min_nights = minNightsNum;
          if (applyRestrictions) {
            updateData.closed_to_arrival = bulkClosedArrival;
            updateData.closed_to_departure = bulkClosedDeparture;
          }
          if (Object.keys(updateData).length > 0) {
            await supabase.from('pricing_rules').update(updateData).eq('id', existingRule.id);
          }
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
            closed_to_arrival: applyRestrictions ? bulkClosedArrival : false,
            closed_to_departure: applyRestrictions ? bulkClosedDeparture : false,
          }]);
        }
      }

      toast.success('Tömeges kitöltés mentve');
      setBulkDialogOpen(false);
      setEditedPrices({});
      setEditedRestrictions({});
      fetchData();
    } catch (error) {
      console.error('Bulk save error:', error);
      toast.error('Hiba a mentéskor');
    }
    setBulkSaving(false);
  };

  const bulkRoomType = roomTypes.find(rt => rt.id === bulkRoomTypeId);

  if (!initialDateRangeSet || !dateRange) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Ártábla</h1>
            <p className="text-muted-foreground mt-1">Szobatípusonkénti árak és korlátozások</p>
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
              <div className="flex items-center gap-2 flex-wrap">
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

                <label className="flex items-center gap-1.5 text-sm cursor-pointer ml-2 pl-2 border-l">
                  <Checkbox
                    checked={showRestrictions}
                    onCheckedChange={(checked) => setShowRestrictions(!!checked)}
                  />
                  Korlátozások
                </label>
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
              <div className="w-full max-h-[calc(100vh-260px)] overflow-auto">
                <div className="min-w-max">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 sticky top-0 left-0 bg-card z-30 min-w-[160px] border-r border-b border-border shadow-[2px_2px_4px_-2px_hsl(var(--border))]">
                          Szobatípus
                        </th>
                        {days.map((day) => (
                          <th key={day.toISOString()} className="p-1 text-center min-w-[56px] sticky top-0 bg-card z-20 border-b border-border shadow-[0_2px_4px_-2px_hsl(var(--border))]">
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
                        <Fragment key={roomType.id}>
                          {/* Ár sor */}
                          <tr key={`${roomType.id}-price`} className={cn(!showRestrictions && "border-b", !roomType.is_active && "opacity-50")}>
                            <td className="p-2 sticky left-0 bg-card z-10 border-r border-border shadow-[2px_0_4px_-2px_hsl(var(--border))] align-top">
                              <div className="font-medium text-sm">{roomType.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Kapacitás: {roomCountByType[roomType.id] ?? 0} szoba
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
                              const isEdited = !!edited;
                              const offSeason = !isDateInSeason(dateStr);

                              return (
                                <td
                                  key={dateStr}
                                  className={cn(
                                    "p-0.5 align-top",
                                    offSeason && "bg-muted/50 opacity-50",
                                    isEdited && !offSeason && "bg-accent/20"
                                  )}
                                  title={offSeason ? 'Szezonon kívüli nap' : 'Ár / éj (Ft)'}
                                >
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Ár"
                                    value={displayPrice}
                                    data-row={roomType.id}
                                    data-col={dateStr}
                                    data-field="price"
                                    onKeyDown={handleCellKeyDown}
                                    onChange={(e) =>
                                      handlePriceChange(roomType.id, dateStr, 'price', e.target.value.replace(/[^0-9]/g, ''))
                                    }
                                    className="h-6 text-[11px] text-center px-1 w-[60px]"
                                  />
                                </td>
                              );
                            })}
                          </tr>

                          {/* Min. éjszaka sor - csak ha a Korlátozások be van kapcsolva */}
                          {showRestrictions && (
                            <tr key={`${roomType.id}-min`} className={cn(!roomType.is_active && "opacity-50")}>
                              <td className="p-2 pl-4 sticky left-0 bg-card z-10 border-r border-border shadow-[2px_0_4px_-2px_hsl(var(--border))]">
                                <div className="text-[11px] text-muted-foreground">Min. éjszaka</div>
                              </td>
                              {days.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const pricing = getPricingForDay(roomType.id, day);
                                const edited = editedPrices[roomType.id]?.[dateStr];
                                const displayMinNights = edited?.minNights || (pricing.min_nights?.toString() ?? '');
                                const isEdited = !!edited;
                                const offSeason = !isDateInSeason(dateStr);

                                return (
                                  <td
                                    key={dateStr}
                                    className={cn(
                                      "p-0.5 align-top",
                                      offSeason && "bg-muted/50 opacity-50",
                                      isEdited && !offSeason && "bg-accent/20"
                                    )}
                                    title="Minimum foglalható éjszakák száma"
                                  >
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Min"
                                      value={displayMinNights}
                                      data-row={roomType.id}
                                      data-col={dateStr}
                                      data-field="min"
                                      onKeyDown={handleCellKeyDown}
                                      onChange={(e) =>
                                        handlePriceChange(roomType.id, dateStr, 'minNights', e.target.value.replace(/[^0-9]/g, ''))
                                      }
                                      className="h-6 text-[11px] text-center px-1 w-[60px]"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {/* Nem érkezési nap sor */}
                          {showRestrictions && (
                            <tr key={`${roomType.id}-arr`} className={cn(!roomType.is_active && "opacity-50")}>
                              <td className="p-2 pl-4 sticky left-0 bg-card z-10 border-r border-border shadow-[2px_0_4px_-2px_hsl(var(--border))]">
                                <div className="text-[11px] text-muted-foreground">Nem érkezési nap</div>
                              </td>
                              {days.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const pricing = getPricingForDay(roomType.id, day);
                                const edited = editedRestrictions[roomType.id]?.[dateStr]?.closedArrival;
                                const checked = edited !== undefined ? edited : pricing.closed_to_arrival;
                                const isEdited = edited !== undefined;
                                const offSeason = !isDateInSeason(dateStr);

                                return (
                                  <td
                                    key={dateStr}
                                    className={cn(
                                      "p-0.5 align-top text-center",
                                      offSeason && "bg-muted/50 opacity-50",
                                      isEdited && !offSeason && "bg-accent/20"
                                    )}
                                    title="Nem lehet ezen a napon érkezni"
                                  >
                                    <div className="h-6 flex items-center justify-center">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(c) => handleRestrictionChange(roomType.id, dateStr, 'closedArrival', !!c)}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {/* Nem távozási nap sor */}
                          {showRestrictions && (
                            <tr key={`${roomType.id}-dep`} className={cn("border-b", !roomType.is_active && "opacity-50")}>
                              <td className="p-2 pl-4 sticky left-0 bg-card z-10 border-r border-border shadow-[2px_0_4px_-2px_hsl(var(--border))]">
                                <div className="text-[11px] text-muted-foreground">Nem távozási nap</div>
                              </td>
                              {days.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const pricing = getPricingForDay(roomType.id, day);
                                const edited = editedRestrictions[roomType.id]?.[dateStr]?.closedDeparture;
                                const checked = edited !== undefined ? edited : pricing.closed_to_departure;
                                const isEdited = edited !== undefined;
                                const offSeason = !isDateInSeason(dateStr);

                                return (
                                  <td
                                    key={dateStr}
                                    className={cn(
                                      "p-0.5 align-top text-center",
                                      offSeason && "bg-muted/50 opacity-50",
                                      isEdited && !offSeason && "bg-accent/20"
                                    )}
                                    title="Nem lehet ezen a napon távozni"
                                  >
                                    <div className="h-6 flex items-center justify-center">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(c) => handleRestrictionChange(roomType.id, dateStr, 'closedDeparture', !!c)}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
              <p>• <strong>Kapacitás:</strong> hány konkrét szoba tartozik ehhez a szobatípushoz (a "Szobák" oldalon felvitt szobák száma) — itt csak megjelenik, a szobák hozzáadása/törlése a "Szobák" oldalon történik. A napi foglalhatóság ebből és a meglévő foglalásokból automatikusan számolódik</p>
              <p>• A <strong>Korlátozások</strong> checkboxszal jeleníthetők meg és szerkeszthetők a minimum tartózkodási és érkezési/távozási szabályok (a Booking.com/szallas.hu extranet mintájára):</p>
              <p className="pl-4">◦ <strong>Min. éjszaka:</strong> az adott naptól induló foglaláshoz szükséges minimum éjszakaszám — ezt a rendszer ténylegesen érvényesíti foglaláskor</p>
              <p className="pl-4">◦ <strong>Nem érkezési nap:</strong> ha be van jelölve, erre a napra nem indítható foglalás (nem lehet ezen a napon érkezni)</p>
              <p className="pl-4">◦ <strong>Nem távozási nap:</strong> ha be van jelölve, erre a napra nem fejezhető be foglalás (nem lehet ezen a napon távozni)</p>
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
            <div className="grid grid-cols-2 gap-3">
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

            {showRestrictions && (
              <div className="space-y-1.5 pt-1 border-t">
                <Label className="text-xs text-muted-foreground">Korlátozások alkalmazása minden kiválasztott napra</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={bulkClosedArrival}
                      onCheckedChange={(checked) => setBulkClosedArrival(!!checked)}
                    />
                    Nem érkezési nap
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={bulkClosedDeparture}
                      onCheckedChange={(checked) => setBulkClosedDeparture(!!checked)}
                    />
                    Nem távozási nap
                  </label>
                </div>
              </div>
            )}
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
