import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Image, Loader2, Users, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/supabase-helpers';

interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  base_capacity: number;
  extra_beds: number;
  adult_extra_beds: number;
  base_price: number;
  amenities: string[];
  is_active: boolean;
  sort_order: number;
}

interface RoomImage {
  id: string;
  room_id: string;
  image_url: string;
  sort_order: number;
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomImages, setRoomImages] = useState<Record<string, RoomImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_capacity: 2,
    extra_beds: 0,
    adult_extra_beds: 0,
    base_price: 0,
    amenities: '',
    is_active: true,
  });

  const fetchRooms = async () => {
    const { data: roomsData, error } = await supabase
      .from('rooms')
      .select('*')
      .order('sort_order');

    if (error) {
      toast.error('Hiba a szobák betöltésekor');
      return;
    }

    const transformedRooms: Room[] = (roomsData || []).map(room => ({
      ...room,
      amenities: Array.isArray(room.amenities) 
        ? (room.amenities as unknown[]).map(a => String(a))
        : [],
    }));

    setRooms(transformedRooms);

    // Fetch images for all rooms
    const { data: imagesData } = await supabase
      .from('room_images')
      .select('*')
      .order('sort_order');

    const imagesByRoom: Record<string, RoomImage[]> = {};
    imagesData?.forEach((img) => {
      if (!imagesByRoom[img.room_id]) {
        imagesByRoom[img.room_id] = [];
      }
      imagesByRoom[img.room_id].push(img);
    });
    setRoomImages(imagesByRoom);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openNewRoom = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      description: '',
      base_capacity: 2,
      extra_beds: 0,
      adult_extra_beds: 0,
      base_price: 0,
      amenities: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || '',
      base_capacity: room.base_capacity,
      extra_beds: room.extra_beds,
      adult_extra_beds: room.adult_extra_beds,
      base_price: room.base_price,
      amenities: room.amenities.join(', '),
      is_active: room.is_active,
    });
    setDialogOpen(true);
  };

  const openCopyRoom = (room: Room) => {
    setEditingRoom(null);
    setFormData({
      name: '',
      description: room.description || '',
      base_capacity: room.base_capacity,
      extra_beds: room.extra_beds,
      adult_extra_beds: room.adult_extra_beds,
      base_price: room.base_price,
      amenities: room.amenities.join(', '),
      is_active: room.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('A szoba neve kötelező');
      return;
    }

    setSaving(true);
    const amenitiesArray = formData.amenities
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const roomData = {
      name: formData.name,
      description: formData.description || null,
      capacity: formData.base_capacity + formData.extra_beds,
      base_capacity: formData.base_capacity,
      extra_beds: formData.extra_beds,
      adult_extra_beds: formData.adult_extra_beds,
      base_price: formData.base_price,
      amenities: amenitiesArray,
      is_active: formData.is_active,
    };

    if (editingRoom) {
      const { error } = await supabase
        .from('rooms')
        .update(roomData)
        .eq('id', editingRoom.id);

      if (error) {
        toast.error('Hiba a mentéskor');
      } else {
        toast.success('Szoba frissítve');
        setDialogOpen(false);
        fetchRooms();
      }
    } else {
      const { error } = await supabase
        .from('rooms')
        .insert([{ ...roomData, sort_order: rooms.length }]);

      if (error) {
        toast.error('Hiba a mentéskor');
      } else {
        toast.success('Szoba létrehozva');
        setDialogOpen(false);
        fetchRooms();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('Biztosan törölni szeretné ezt a szobát?')) return;

    const { error } = await supabase.from('rooms').delete().eq('id', roomId);

    if (error) {
      toast.error('Hiba a törléskor');
    } else {
      toast.success('Szoba törölve');
      fetchRooms();
    }
  };

  const handleImageUpload = async (roomId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${roomId}/${Date.now()}.${fileExt}`;

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

    const { error } = await supabase.from('room_images').insert([
      {
        room_id: roomId,
        image_url: publicUrl.publicUrl,
        sort_order: (roomImages[roomId]?.length || 0),
      },
    ]);

    if (error) {
      toast.error('Hiba a kép mentésekor');
    } else {
      toast.success('Kép feltöltve');
      fetchRooms();
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    const { error } = await supabase.from('room_images').delete().eq('id', imageId);

    if (error) {
      toast.error('Hiba a kép törlésekor');
    } else {
      toast.success('Kép törölve');
      fetchRooms();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Szobák</h1>
            <p className="text-muted-foreground mt-1">Szobák kezelése</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewRoom}>
                <Plus className="mr-2 h-4 w-4" />
                Új szoba
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingRoom ? 'Szoba szerkesztése' : 'Új szoba'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Szoba neve *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="pl. Deluxe kétágyas szoba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Leírás</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Szoba leírása..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_capacity">Alaplétszám (fő)</Label>
                    <Input
                      id="base_capacity"
                      type="number"
                      min={1}
                      max={99}
                      value={formData.base_capacity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          base_capacity: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extra_beds">Max. pótágyak száma (fő)</Label>
                    <Input
                      id="extra_beds"
                      type="number"
                      min={0}
                      max={99}
                      value={formData.extra_beds}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extra_beds: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max. létszám (fő)</Label>
                    <Input
                      type="number"
                      value={formData.base_capacity + formData.extra_beds}
                      readOnly
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adult_extra_beds">Ebből felnőtt méretű (fő)</Label>
                    <Input
                      id="adult_extra_beds"
                      type="number"
                      min={0}
                      max={formData.extra_beds}
                      value={formData.adult_extra_beds}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adult_extra_beds: Math.min(parseInt(e.target.value) || 0, formData.extra_beds),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_price">Alapár / éj (Ft)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    min={0}
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        base_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenities">Felszereltség (vesszővel elválasztva)</Label>
                  <Input
                    id="amenities"
                    value={formData.amenities}
                    onChange={(e) =>
                      setFormData({ ...formData, amenities: e.target.value })
                    }
                    placeholder="WiFi, TV, Légkondicionáló, Minibar"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Aktív (megjelenik a vendégoldalon)</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mentés...
                    </>
                  ) : (
                    'Mentés'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Még nincsenek szobák. Hozza létre az elsőt!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id} className="overflow-hidden">
                {/* Room images */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {roomImages[room.id]?.[0] ? (
                    <img
                      src={roomImages[room.id][0].image_url}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  {!room.is_active && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <span className="text-muted-foreground font-medium">Inaktív</span>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="font-display text-lg">{room.name}</CardTitle>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <Users className="h-4 w-4 mr-1" />
                      {room.capacity}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Alapár:</span>
                    <span className="font-medium">{formatPrice(room.base_price)} / éj</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max. létszám:</span>
                    <span className="font-medium">{room.capacity} fő</span>
                  </div>
                  
                  {/* Image management */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Képek ({roomImages[room.id]?.length || 0})</Label>
                    <div className="flex gap-2 flex-wrap">
                      {roomImages[room.id]?.map((img) => (
                        <div key={img.id} className="relative group w-12 h-12">
                          <img
                            src={img.image_url}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="absolute inset-0 bg-destructive/80 text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <label className="w-12 h-12 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(room.id, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditRoom(room)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Szerkesztés
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Szoba másolása"
                      onClick={() => openCopyRoom(room)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(room.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
