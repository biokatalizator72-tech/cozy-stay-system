import { useAuth } from '@/hooks/useAuth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import AdminBookingsPage from '@/pages/admin/AdminBookings';
import { Loader2 } from 'lucide-react';

export default function AdminBookingsRoute() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLogin />;
  }

  return <AdminBookingsPage />;
}
