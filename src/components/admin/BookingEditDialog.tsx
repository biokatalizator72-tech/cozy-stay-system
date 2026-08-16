import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RoomType {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  name: string;
  room_type_id: string | null;
}

interface BookingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    check_in: string;
    check_out: string;
    room_type_id: string | null;
    room_id: string | null;
    total_price: number;
  } | null;
  onSaved: () => void;
}

export function BookingEditDialog({ open, onOpenChange, booking, onSaved }: BookingEditDialogProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setCheckIn(booking.check_in);
      setCheckOut(booking.check_out);
      setRoomTypeId(booking.room_type_id || '');
      setRoomId(booking.room_id || '');
      setTotalPrice(String(booking.total_price));
    }
  }, [booking]);

  useEffect(() => {
    if (open) {
      supabase
        .from('room_types')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => setRoomTypes(data || []));
      supabase
        .from('rooms')
        .select('id, name, room_type_id')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => setRooms(data || []));
    }
  }, [open]);

  // Ha a szobatípus változik, és a jelenleg kiválasztott konkrét szoba
  // nem ehhez a típushoz tartozik, ürítsük ki — ne maradjon inkonzisztens
  // (típus A, de a hozzárendelt szoba B típusú) állapot.
  useEffect(() => {
    if (!roomId) return;
    const current = rooms.find((r) => r.id === roomId);
    if (current && roomTypeId && current.room_type_id !== roomTypeId) {
      setRoomId('');
    }
  }, [roomTypeId, rooms, roomId]);

  const roomsForType = rooms.filter((r) => r.room_type_id === roomTypeId);

  const handleSave = async () => {
    if (!booking) return;
    if (!checkIn || !checkOut || !totalPrice) {
      toast.error('Kérlek töltsd ki az összes mezőt');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error('A távozás dátuma későbbi kell legyen, mint az érkezés');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('bookings')
      .update({
        check_in: checkIn,
        check_out: checkOut,
        room_type_id: roomTypeId || null,
        room_id: roomId || null,
        total_price: Number(totalPrice),
      })
      .eq('id', booking.id);

    setSaving(false);

    if (error) {
      // Az EXCLUDE constraint (bookings_no_overlapping_room) ütközés esetén
      // egyértelmű hibát ad vissza — ilyenkor a választott szoba már foglalt
      // az adott időszakra.
      if (error.message?.includes('bookings_no_overlapping_room')) {
        toast.error('Ez a szoba már foglalt a megadott időszakra.');
      } else {
        toast.error('Hiba a foglalás mentésekor');
      }
    } else {
      toast.success('Foglalás sikeresen módosítva');
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Foglalás szerkesztése</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Érkezés</Label>
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Távozás</Label>
            <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Szobatípus</Label>
            <Select value={roomTypeId} onValueChange={setRoomTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz szobatípust" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Konkrét szoba</Label>
            <Select value={roomId} onValueChange={setRoomId} disabled={!roomTypeId}>
              <SelectTrigger>
                <SelectValue placeholder={roomTypeId ? 'Válassz szobát' : 'Először válassz szobatípust'} />
              </SelectTrigger>
              <SelectContent>
                {roomsForType.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Végösszeg (Ft)</Label>
            <Input
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              min={0}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mentés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
