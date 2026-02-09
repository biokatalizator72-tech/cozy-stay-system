import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Room {
  id: string;
  name: string;
  room_type_id: string | null;
  is_active: boolean;
  sort_order: number;
}

interface RoomType {
  id: string;
  name: string;
  capacity: number;
  base_price: number;
  is_active: boolean;
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    room_type_id: '',
    is_active: true,
  });

  const fetchData = async () => {
    const [roomsResponse, roomTypesResponse] = await Promise.all([
      supabase.from('rooms').select('id, name, room_type_id, is_active, sort_order').order('sort_order'),
      supabase.from('room_types').select('id, name, capacity, base_price, is_active').order('sort_order'),
    ]);

    if (roomsResponse.error) {
      toast.error('Hiba a szobák betöltésekor');
      return;
    }

    setRooms(roomsResponse.data || []);
    setRoomTypes(roomTypesResponse.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRoomTypeName = (roomTypeId: string | null) => {
    if (!roomTypeId) return 'Nincs típus';
    const roomType = roomTypes.find(rt => rt.id === roomTypeId);
    return roomType?.name || 'Ismeretlen típus';
  };

  const openNewRoom = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      room_type_id: roomTypes[0]?.id || '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      room_type_id: room.room_type_id || '',
      is_active: room.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('A szoba neve kötelező');
      return;
    }

    if (!formData.room_type_id) {
      toast.error('Válasszon szobatípust');
      return;
    }

    setSaving(true);

    const roomData = {
      name: formData.name,
      room_type_id: formData.room_type_id,
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
        fetchData();
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
        fetchData();
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
      fetchData();
    }
  };

  // Group rooms by room type
  const roomsByType = rooms.reduce((acc, room) => {
    const typeId = room.room_type_id || 'no-type';
    if (!acc[typeId]) {
      acc[typeId] = [];
    }
    acc[typeId].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Szobák</h1>
            <p className="text-muted-foreground mt-1">Egyedi szobák kezelése (típushoz rendelve)</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewRoom} disabled={roomTypes.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Új szoba
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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
                    placeholder="pl. 101, Panoráma szoba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room_type_id">Szobatípus *</Label>
                  <Select
                    value={formData.room_type_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, room_type_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon szobatípust" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name} ({rt.capacity} fő)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Aktív</Label>
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
        ) : roomTypes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Először hozzon létre szobatípusokat a "Szobatípusok" menüpontban.
              </p>
            </CardContent>
          </Card>
        ) : rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Még nincsenek szobák. Hozza létre az elsőt!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {roomTypes.map((roomType) => {
              const typeRooms = roomsByType[roomType.id] || [];
              if (typeRooms.length === 0) return null;
              
              return (
                <Card key={roomType.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="font-display text-lg">{roomType.name}</CardTitle>
                      <Badge variant="secondary">{typeRooms.length} szoba</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {typeRooms.map((room) => (
                        <div
                          key={room.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            room.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{room.name}</p>
                            {!room.is_active && (
                              <p className="text-xs text-muted-foreground">Inaktív</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditRoom(room)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(room.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Rooms without type */}
            {roomsByType['no-type']?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="font-display text-lg text-muted-foreground">Típus nélküli szobák</CardTitle>
                    <Badge variant="outline">{roomsByType['no-type'].length} szoba</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {roomsByType['no-type'].map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div>
                          <p className="font-medium">{room.name}</p>
                          <p className="text-xs text-destructive">Nincs típus!</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditRoom(room)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(room.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
