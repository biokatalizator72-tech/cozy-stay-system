import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Bed, ClipboardList, Calendar, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/supabase-helpers';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalRooms: number;
  pendingBookings: number;
  confirmedBookings: number;
  monthlyRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch room count
        const { count: roomCount } = await supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true });

        // Fetch pending bookings
        const { count: pendingCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch confirmed bookings this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: confirmedBookings } = await supabase
          .from('bookings')
          .select('total_price')
          .eq('status', 'confirmed')
          .gte('created_at', startOfMonth.toISOString());

        const monthlyRevenue = confirmedBookings?.reduce(
          (sum, b) => sum + Number(b.total_price || 0),
          0
        ) || 0;

        setStats({
          totalRooms: roomCount || 0,
          pendingBookings: pendingCount || 0,
          confirmedBookings: confirmedBookings?.length || 0,
          monthlyRevenue,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Összes szoba',
      value: stats.totalRooms,
      icon: Bed,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Függőben lévő foglalások',
      value: stats.pendingBookings,
      icon: ClipboardList,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Havi foglalások',
      value: stats.confirmedBookings,
      icon: Calendar,
      color: 'text-teal-light',
      bgColor: 'bg-teal/10',
    },
    {
      title: 'Havi bevétel',
      value: formatPrice(stats.monthlyRevenue),
      icon: TrendingUp,
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold">Áttekintés</h1>
          <p className="text-muted-foreground mt-1">
            Üdvözöljük az admin felületen
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="animate-slide-up">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Gyors műveletek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/admin/rooms">
                <Button variant="outline" className="w-full justify-start">
                  <Bed className="mr-2 h-4 w-4" />
                  Szoba hozzáadása
                </Button>
              </Link>
              <Link to="/admin/bookings">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Foglalások megtekintése
                </Button>
              </Link>
              <Link to="/admin/pricing">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Árak beállítása
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Vendégoldal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                A vendégek ezen az oldalon tekinthetik meg a szobákat és foglalhatnak.
              </p>
              <Link to="/" target="_blank">
                <Button className="w-full">
                  Vendégoldal megnyitása
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
