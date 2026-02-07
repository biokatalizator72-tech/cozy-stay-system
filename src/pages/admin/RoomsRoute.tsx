import { useAuth } from '@/hooks/useAuth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import AdminRoomsPage from '@/pages/admin/AdminRooms';
import { Loader2 } from 'lucide-react';

export default function AdminRoomsRoute() {
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

  return <AdminRoomsPage />;
}
