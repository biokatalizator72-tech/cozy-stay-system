import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save } from 'lucide-react';

interface NightDiscount {
  id: string;
  min_nights: number;
  discount_percent: number;
  sort_order: number;
}

interface SpecialDiscount {
  id: string;
  name: string;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
}

const PRESET_DISCOUNT_NAMES = [
  'Előfoglalási kedvezmény',
  'Törzsvendég kedvezmény',
  'Családbarát kedvezmény',
  'Last minute kedvezmény',
  'Szenior kedvezmény',
];

const DISCOUNT_PERCENTAGES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export default function AdminDiscounts() {
  const { toast } = useToast();
  const [nightDiscounts, setNightDiscounts] = useState<NightDiscount[]>([]);
  const [specialDiscounts, setSpecialDiscounts] = useState<SpecialDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDiscountName, setNewDiscountName] = useState('');
  const [newDiscountCustomName, setNewDiscountCustomName] = useState('');
  const [newDiscountPercent, setNewDiscountPercent] = useState<number>(10);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const [nightRes, specialRes] = await Promise.all([
        supabase
          .from('night_discounts')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('special_discounts')
          .select('*')
          .order('sort_order', { ascending: true }),
      ]);

      if (nightRes.error) throw nightRes.error;
      if (specialRes.error) throw specialRes.error;

      setNightDiscounts(nightRes.data || []);
      setSpecialDiscounts(specialRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni a kedvezményeket.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Night discounts handlers
  const addNightDiscount = () => {
    const maxOrder = nightDiscounts.length > 0
      ? Math.max(...nightDiscounts.map(d => d.sort_order))
      : 0;
    setNightDiscounts([
      ...nightDiscounts,
      {
        id: `temp-${Date.now()}`,
        min_nights: 3,
        discount_percent: 5,
        sort_order: maxOrder + 1,
      },
    ]);
  };

  const updateNightDiscount = (id: string, field: keyof NightDiscount, value: number) => {
    setNightDiscounts(nightDiscounts.map(d =>
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const removeNightDiscount = async (id: string) => {
    if (id.startsWith('temp-')) {
      setNightDiscounts(nightDiscounts.filter(d => d.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('night_discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNightDiscounts(nightDiscounts.filter(d => d.id !== id));
      toast({ title: 'Kedvezmény törölve' });
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni a kedvezményt.',
        variant: 'destructive',
      });
    }
  };

  const saveNightDiscounts = async () => {
    setSaving(true);
    try {
      for (const discount of nightDiscounts) {
        if (discount.id.startsWith('temp-')) {
          const { error } = await supabase
            .from('night_discounts')
            .insert({
              min_nights: discount.min_nights,
              discount_percent: discount.discount_percent,
              sort_order: discount.sort_order,
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('night_discounts')
            .update({
              min_nights: discount.min_nights,
              discount_percent: discount.discount_percent,
              sort_order: discount.sort_order,
            })
            .eq('id', discount.id);
          if (error) throw error;
        }
      }

      toast({ title: 'Éjszaka kedvezmények mentve' });
      fetchDiscounts();
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült menteni a kedvezményeket.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Special discounts handlers
  const handleAddSpecialDiscount = async () => {
    const name = newDiscountName === 'custom' ? newDiscountCustomName : newDiscountName;
    if (!name.trim()) {
      toast({
        title: 'Hiba',
        description: 'Kérjük, adja meg a kedvezmény nevét.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const maxOrder = specialDiscounts.length > 0
        ? Math.max(...specialDiscounts.map(d => d.sort_order))
        : 0;

      const { error } = await supabase
        .from('special_discounts')
        .insert({
          name: name.trim(),
          discount_percent: newDiscountPercent,
          is_active: true,
          sort_order: maxOrder + 1,
        });

      if (error) throw error;

      toast({ title: 'Kedvezmény hozzáadva' });
      setDialogOpen(false);
      setNewDiscountName('');
      setNewDiscountCustomName('');
      setNewDiscountPercent(10);
      fetchDiscounts();
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült hozzáadni a kedvezményt.',
        variant: 'destructive',
      });
    }
  };

  const updateSpecialDiscount = async (id: string, field: keyof SpecialDiscount, value: any) => {
    try {
      const { error } = await supabase
        .from('special_discounts')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setSpecialDiscounts(specialDiscounts.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      ));
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült frissíteni a kedvezményt.',
        variant: 'destructive',
      });
    }
  };

  const removeSpecialDiscount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('special_discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSpecialDiscounts(specialDiscounts.filter(d => d.id !== id));
      toast({ title: 'Kedvezmény törölve' });
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni a kedvezményt.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-bold">Kedvezmények beállítása</h1>

      {/* Night discounts section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Éjszakák száma szerinti kedvezmények</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addNightDiscount}>
              <Plus className="h-4 w-4 mr-1" />
              Új sáv
            </Button>
            <Button size="sm" onClick={saveNightDiscounts} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              Mentés
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {nightDiscounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Még nincs éjszaka kedvezmény beállítva. Kattintson az "Új sáv" gombra.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Min. éjszaka</TableHead>
                  <TableHead>Kedvezmény %</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nightDiscounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={discount.min_nights}
                        onChange={(e) =>
                          updateNightDiscount(discount.id, 'min_nights', parseInt(e.target.value) || 1)
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discount.discount_percent}
                          onChange={(e) =>
                            updateNightDiscount(discount.id, 'discount_percent', parseInt(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNightDiscount(discount.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            A kedvezmény automatikusan alkalmazódik, ha a vendég legalább ennyi éjszakára foglal.
          </p>
        </CardContent>
      </Card>

      {/* Special discounts section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Különleges kedvezmények</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Új kedvezmény felvitele
          </Button>
        </CardHeader>
        <CardContent>
          {specialDiscounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Még nincs különleges kedvezmény beállítva.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kedvezmény neve</TableHead>
                  <TableHead>Kedvezmény %</TableHead>
                  <TableHead>Aktív</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialDiscounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-medium">{discount.name}</TableCell>
                    <TableCell>
                      <Select
                        value={discount.discount_percent.toString()}
                        onValueChange={(value) =>
                          updateSpecialDiscount(discount.id, 'discount_percent', parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCOUNT_PERCENTAGES.map((p) => (
                            <SelectItem key={p} value={p.toString()}>
                              {p}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.is_active}
                        onCheckedChange={(checked) =>
                          updateSpecialDiscount(discount.id, 'is_active', checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpecialDiscount(discount.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Az aktív kedvezmények a foglalási oldalon választhatók ki a vendégek által.
          </p>
        </CardContent>
      </Card>

      {/* Add special discount dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új kedvezmény felvitele</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kedvezmény neve</label>
              <Select value={newDiscountName} onValueChange={setNewDiscountName}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon típust..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_DISCOUNT_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Egyedi név...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newDiscountName === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Egyedi név</label>
                <Input
                  value={newDiscountCustomName}
                  onChange={(e) => setNewDiscountCustomName(e.target.value)}
                  placeholder="Pl. Nyári akció kedvezmény"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Kedvezmény mértéke</label>
              <Select
                value={newDiscountPercent.toString()}
                onValueChange={(value) => setNewDiscountPercent(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_PERCENTAGES.map((p) => (
                    <SelectItem key={p} value={p.toString()}>
                      {p}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleAddSpecialDiscount}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
