import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Building, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Tableau de bord', name_en: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Gestion des ouvriers', name_en: 'Workers', href: '/workers', icon: Users },
  { name: 'Chambres', name_en: 'Rooms', href: '/rooms', icon: Building },
  { name: 'Paramètres', name_en: 'Settings', href: '/settings', icon: Settings },
];

export function Navigation() {
  const location = useLocation();
  const { logout } = useAuth();
  const { isOnline, wasOffline } = useNetworkStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:bg-sidebar lg:border-r lg:border-sidebar-border">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h1 className="text-lg font-bold text-sidebar-foreground">
                  Gestion du Dortoir
                </h1>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-sidebar-foreground/60">
                    Système de gestion des ouvriers
                  </p>
                  {!isOnline && (
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" title="Hors ligne" />
                  )}
                  {isOnline && wasOffline && (
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" title="Connecté" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon 
                    className={cn(
                      'w-5 h-5 mr-3 flex-shrink-0',
                      isActive 
                        ? 'text-sidebar-accent-foreground' 
                        : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'
                    )} 
                  />
                  <span className="flex-1 text-left">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
          
          <div className="flex-shrink-0 px-4 pb-4">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="flex-1 text-left">
                Déconnexion
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile header */}
        <div className="flex items-center justify-between h-16 px-4 bg-sidebar border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-sidebar-foreground">
                Gestion du Dortoir
              </h1>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-0 right-0 w-64 h-full bg-sidebar border-l border-sidebar-border">
              <div className="flex flex-col h-full pt-5 pb-4">
                <div className="flex items-center justify-between px-6 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <h1 className="text-lg font-bold text-sidebar-foreground">
                        Gestion du Dortoir
                      </h1>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <nav className="flex-1 px-4 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Icon 
                          className={cn(
                            'w-5 h-5 mr-3 flex-shrink-0',
                            isActive 
                              ? 'text-sidebar-accent-foreground' 
                              : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'
                          )} 
                        />
                        <span className="flex-1 text-left">
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
                
                <div className="px-4 pb-4">
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="flex-1 text-left">
                      Déconnexion
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
