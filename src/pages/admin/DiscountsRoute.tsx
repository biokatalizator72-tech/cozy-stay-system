import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminLogin } from '@/components/admin/AdminLogin';
import AdminDiscounts from './AdminDiscounts';

export default function DiscountsRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout>
      <AdminDiscounts />
    </AdminLayout>
  );
}
