import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string | null;
  guestName: string;
  onDeleted: () => void;
}

export function BookingDeleteDialog({ open, onOpenChange, bookingId, guestName, onDeleted }: BookingDeleteDialogProps) {
  const handleDelete = async () => {
    if (!bookingId) return;

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      toast.error('Hiba a foglalás törlésekor');
    } else {
      toast.success('Foglalás sikeresen törölve');
      onOpenChange(false);
      onDeleted();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Biztosan törölni szeretnéd?</AlertDialogTitle>
          <AlertDialogDescription>
            A(z) <strong>{guestName}</strong> foglalása véglegesen törlődik. Ez a művelet nem vonható vissza.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégse</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Törlés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
