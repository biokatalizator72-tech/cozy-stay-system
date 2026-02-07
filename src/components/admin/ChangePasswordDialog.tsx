import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function ChangePasswordDialog({ open, onComplete }: ChangePasswordDialogProps) {
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      toast.error('A jelszónak legalább 8 karakter hosszúnak kell lennie');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('A jelszavak nem egyeznek');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(newPassword);
    
    if (error) {
      toast.error('Hiba történt a jelszó módosításakor');
    } else {
      toast.success('Jelszó sikeresen megváltoztatva');
      onComplete();
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center mb-2">
            <ShieldAlert className="w-7 h-7 text-accent" />
          </div>
          <DialogTitle className="font-display text-xl">Jelszó módosítása kötelező</DialogTitle>
          <DialogDescription>
            Az első bejelentkezés után meg kell változtatnia jelszavát a biztonság érdekében.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Új jelszó</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Minimum 8 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Jelszó megerősítése</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Írja be újra a jelszót"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mentés...
              </>
            ) : (
              'Jelszó mentése'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
