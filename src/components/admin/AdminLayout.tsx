import { ReactNode, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  Bed,
  Calendar,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Percent,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Áttekintés', href: '/admin', icon: Building2 },
  { name: 'Szobatípusok', href: '/admin/room-types', icon: Layers },
  { name: 'Szobák', href: '/admin/rooms', icon: Bed },
  { name: 'Árazás', href: '/admin/pricing', icon: Calendar },
  { name: 'Kedvezmények', href: '/admin/discounts', icon: Percent },
  { name: 'Foglalások', href: '/admin/bookings', icon: ClipboardList },
  { name: 'Beállítások', href: '/admin/settings', icon: Settings },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut, mustChangePassword, refreshAuthState } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <ChangePasswordDialog
        open={mustChangePassword}
        onComplete={() => refreshAuthState()}
      />
      
      <div className="min-h-screen bg-background">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <Link to="/admin" className="font-display text-lg font-semibold text-primary">
            PMS Admin
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur animate-fade-in">
            <div className="pt-20 px-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-3 text-destructive hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-5 w-5" />
                Kijelentkezés
              </Button>
            </div>
          </div>
        )}

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r">
            <div className="flex flex-col flex-1 pt-6 pb-4 overflow-y-auto">
              <div className="px-6 mb-8">
                <Link to="/admin" className="font-display text-xl font-semibold text-primary">
                  PMS Admin
                </Link>
              </div>
              <nav className="flex-1 px-3 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="px-3 mt-auto">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="h-5 w-5" />
                  Kijelentkezés
                </Button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 lg:pl-64">
            <div className="p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
