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

interface BookingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    check_in: string;
    check_out: string;
    room_type_id: string | null;
    total_price: number;
  } | null;
  onSaved: () => void;
}

export function BookingEditDialog({ open, onOpenChange, booking, onSaved }: BookingEditDialogProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setCheckIn(booking.check_in);
      setCheckOut(booking.check_out);
      setRoomTypeId(booking.room_type_id || '');
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
    }
  }, [open]);

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
        total_price: Number(totalPrice),
      })
      .eq('id', booking.id);

    setSaving(false);

    if (error) {
      toast.error('Hiba a foglalás mentésekor');
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
