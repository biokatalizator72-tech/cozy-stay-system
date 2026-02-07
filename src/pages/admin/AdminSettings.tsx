import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Plus, Trash2, Image } from 'lucide-react';
import { toast } from 'sonner';

interface PropertySettings {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  booking_email_template: string | null;
  ical_url: string | null;
  guest_fields: string[];
}

interface PropertyImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data: settingsData } = await supabase
      .from('property_settings')
      .select('*')
      .maybeSingle();

    const { data: imagesData } = await supabase
      .from('property_images')
      .select('*')
      .order('sort_order');

    if (settingsData) {
      setSettings({
        ...settingsData,
        guest_fields: Array.isArray(settingsData.guest_fields) 
          ? settingsData.guest_fields as string[]
          : ['name', 'email', 'phone', 'arrival_time', 'special_requests'],
      });
    }
    setPropertyImages(imagesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from('property_settings')
      .update({
        name: settings.name,
        description: settings.description,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        latitude: settings.latitude,
        longitude: settings.longitude,
        booking_email_template: settings.booking_email_template,
        ical_url: settings.ical_url,
        guest_fields: settings.guest_fields,
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Hiba a mentéskor');
    } else {
      toast.success('Beállítások mentve');
    }
    setSaving(false);
  };

  const handleImageUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `property/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Hiba a kép feltöltésekor');
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);

    const { error } = await supabase.from('property_images').insert([
      {
        image_url: publicUrl.publicUrl,
        sort_order: propertyImages.length,
      },
    ]);

    if (error) {
      toast.error('Hiba a kép mentésekor');
    } else {
      toast.success('Kép feltöltve');
      fetchData();
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    const { error } = await supabase.from('property_images').delete().eq('id', imageId);

    if (error) {
      toast.error('Hiba a kép törlésekor');
    } else {
      toast.success('Kép törölve');
      fetchData();
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">
          Hiba: Nem sikerült betölteni a beállításokat
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Beállítások</h1>
            <p className="text-muted-foreground mt-1">Szálláshely adatainak kezelése</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Mentés
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Általános</TabsTrigger>
            <TabsTrigger value="images">Képek</TabsTrigger>
            <TabsTrigger value="email">Email sablon</TabsTrigger>
            <TabsTrigger value="ical">iCal</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Szálláshely adatai</CardTitle>
                <CardDescription>
                  Ezek az adatok jelennek meg a vendégoldalon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Szálláshely neve</Label>
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) =>
                        setSettings({ ...settings, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={settings.phone || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Cím</Label>
                    <Input
                      id="address"
                      value={settings.address || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, address: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Leírás</Label>
                  <Textarea
                    id="description"
                    value={settings.description || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Szélesség (latitude)</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={settings.latitude || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          latitude: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="pl. 47.4979"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Hosszúság (longitude)</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={settings.longitude || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          longitude: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="pl. 19.0402"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Szálláshely képei</CardTitle>
                <CardDescription>
                  Ezek a képek jelennek meg a főoldalon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  {propertyImages.map((img) => (
                    <div key={img.id} className="relative group aspect-video">
                      <img
                        src={img.image_url}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute inset-0 bg-destructive/80 text-destructive-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Kép feltöltése</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email sablon</CardTitle>
                <CardDescription>
                  Ez az email megy ki a vendégnek foglalás után. Használható változók: {'{guest_name}'}, {'{room_name}'}, {'{check_in}'}, {'{check_out}'}, {'{total_price}'}, {'{property_name}'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.booking_email_template || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, booking_email_template: e.target.value })
                  }
                  rows={12}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>iCal szinkronizáció</CardTitle>
                <CardDescription>
                  Külső naptárak importálása (pl. Booking.com, Airbnb)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ical_url">iCal URL</Label>
                  <Input
                    id="ical_url"
                    value={settings.ical_url || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, ical_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Ez a funkció még fejlesztés alatt áll. A rendszer később automatikusan szinkronizálja a foglalt dátumokat.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
