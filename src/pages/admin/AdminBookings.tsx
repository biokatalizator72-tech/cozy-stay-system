import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, CheckCircle, XCircle, Mail, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, formatDate } from '@/lib/supabase-helpers';
import { BookingEditDialog } from '@/components/admin/BookingEditDialog';
import { BookingDeleteDialog } from '@/components/admin/BookingDeleteDialog';

interface Booking {
  id: string;
  room_id: string | null;
  room_type_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  total_price: number;
  status: string;
  arrival_time: string | null;
  special_requests: string | null;
  guest_data: unknown;
  created_at: string;
  rooms?: { name: string } | null;
  room_types?: { id: string; name: string } | null;
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        rooms (name),
        room_types (id, name)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Hiba a foglalások betöltésekor');
      return;
    }

    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast.error('Hiba a státusz frissítésekor');
    } else {
      toast.success(`Foglalás ${newStatus === 'confirmed' ? 'megerősítve' : 'lemondva'}`);
      fetchBookings();
      setSelectedBooking(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Függőben</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary">Megerősítve</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Lemondva</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditFromDetails = () => {
    if (selectedBooking) {
      setEditBooking(selectedBooking);
      setSelectedBooking(null);
    }
  };

  const handleDeleteFromDetails = () => {
    if (selectedBooking) {
      setDeleteBooking(selectedBooking);
      setSelectedBooking(null);
    }
  };

  const handleSaved = () => {
    fetchBookings();
    setEditBooking(null);
  };

  const handleDeleted = () => {
    fetchBookings();
    setDeleteBooking(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">Foglalások</h1>
            <p className="text-muted-foreground mt-1">Foglalások kezelése és jóváhagyása</p>
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status === 'all' && 'Összes'}
                {status === 'pending' && 'Függőben'}
                {status === 'confirmed' && 'Megerősített'}
                {status === 'cancelled' && 'Lemondott'}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nincsenek foglalások
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendég</TableHead>
                    <TableHead>Szoba</TableHead>
                    <TableHead>Dátum</TableHead>
                    <TableHead>Összeg</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.guest_name}</div>
                          <div className="text-sm text-muted-foreground">{booking.guest_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.rooms?.name || 'Nincs szoba hozzárendelve'}</div>
                          {booking.room_types?.name && (
                            <div className="text-sm text-muted-foreground">{booking.room_types.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(booking.check_in)}</div>
                          <div className="text-muted-foreground">→ {formatDate(booking.check_out)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatPrice(booking.total_price)}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(booking)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditBooking(booking)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteBooking(booking)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Foglalás részletei</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Vendég neve</div>
                    <div className="font-medium">{selectedBooking.guest_name}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedBooking.guest_email}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Telefon</div>
                    <div className="font-medium">{selectedBooking.guest_phone || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Szoba</div>
                    <div className="font-medium">{selectedBooking.rooms?.name || 'Nincs hozzárendelve'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Szobatípus</div>
                    <div className="font-medium">{selectedBooking.room_types?.name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Érkezés</div>
                    <div className="font-medium">{formatDate(selectedBooking.check_in)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Távozás</div>
                    <div className="font-medium">{formatDate(selectedBooking.check_out)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Érkezés ideje</div>
                    <div className="font-medium">{selectedBooking.arrival_time || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Összeg</div>
                    <div className="font-medium">{formatPrice(selectedBooking.total_price)}</div>
                  </div>
                </div>

                {selectedBooking.special_requests && (
                  <div>
                    <div className="text-muted-foreground text-sm">Speciális kérések</div>
                    <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                      {selectedBooking.special_requests}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Státusz:</span>
                  {getStatusBadge(selectedBooking.status)}
                </div>

                {selectedBooking.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button className="flex-1" onClick={() => updateStatus(selectedBooking.id, 'confirmed')}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Megerősítés
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selectedBooking.id, 'cancelled')}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Lemondás
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={handleEditFromDetails}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Szerkesztés
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDeleteFromDetails}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Törlés
                  </Button>
                </div>

                <a
                  href={`mailto:${selectedBooking.guest_email}`}
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email küldése a vendégnek
                </a>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <BookingEditDialog
          open={!!editBooking}
          onOpenChange={(open) => !open && setEditBooking(null)}
          booking={editBooking}
          onSaved={handleSaved}
        />

        {/* Delete Dialog */}
        <BookingDeleteDialog
          open={!!deleteBooking}
          onOpenChange={(open) => !open && setDeleteBooking(null)}
          bookingId={deleteBooking?.id || null}
          guestName={deleteBooking?.guest_name || ''}
          onDeleted={handleDeleted}
        />
      </div>
    </AdminLayout>
  );
}
