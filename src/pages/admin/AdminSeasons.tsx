import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchSeasons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .order('sort_order')
      .order('start_date');
    setSeasons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSeasons(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (season: Season) => {
    setEditing(season);
    setName(season.name);
    setStartDate(season.start_date);
    setEndDate(season.end_date);
    setIsActive(season.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !startDate || !endDate) {
      toast.error('Minden mező kitöltése kötelező');
      return;
    }
    if (startDate > endDate) {
      toast.error('A kezdő dátum nem lehet későbbi a záró dátumnál');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('seasons')
          .update({ name, start_date: startDate, end_date: endDate, is_active: isActive })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Szezon frissítve');
      } else {
        const { error } = await supabase
          .from('seasons')
          .insert([{ name, start_date: startDate, end_date: endDate, is_active: isActive }]);
        if (error) throw error;
        toast.success('Szezon létrehozva');
      }
      setDialogOpen(false);
      fetchSeasons();
    } catch (error) {
      console.error(error);
      toast.error('Hiba a mentéskor');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törli ezt a szezont?')) return;
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) {
      toast.error('Hiba a törléskor');
    } else {
      toast.success('Szezon törölve');
      fetchSeasons();
    }
  };

  const toggleActive = async (season: Season) => {
    const { error } = await supabase
      .from('seasons')
      .update({ is_active: !season.is_active })
      .eq('id', season.id);
    if (error) {
      toast.error('Hiba a módosításkor');
    } else {
      fetchSeasons();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Szezonok</h1>
            <p className="text-muted-foreground mt-1">Nyitvatartási időszakok kezelése</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Új szezon
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Szezonok listája</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : seasons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Még nincsenek szezonok. Ha nem ad meg szezont, minden dátum elérhető lesz.
              </p>
            ) : (
              <div className="space-y-3">
                {seasons.map((season) => (
                  <div
                    key={season.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={season.is_active}
                        onCheckedChange={() => toggleActive(season)}
                      />
                      <div>
                        <p className="font-medium">{season.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(season.start_date + 'T00:00:00'), 'yyyy. MM. dd.')} – {format(new Date(season.end_date + 'T00:00:00'), 'yyyy. MM. dd.')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(season)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(season.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Megjegyzés:</strong> Ha nincsenek szezonok megadva, a foglalási naptár minden dátumot engedélyez. 
              Ha van legalább egy aktív szezon, csak a szezonokon belüli dátumok lesznek elérhetők a vendégek számára és az ártáblában.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Szezon szerkesztése' : 'Új szezon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Név</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Nyári szezon" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kezdő dátum</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Záró dátum</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Aktív</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Mégsem</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
