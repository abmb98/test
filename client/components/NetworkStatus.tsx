import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkStatus() {
  const { isOnline, quality, lastCheck } = useNetworkStatus();

  // Don't show anything if connection is good
  if (isOnline && quality === 'good') {
    return null;
  }

  const getStatusInfo = () => {
    if (!isOnline || quality === 'offline') {
      return {
        variant: 'destructive' as const,
        icon: <WifiOff className="h-4 w-4" />,
        title: 'Hors ligne',
        message: 'Vous êtes actuellement hors ligne. Vos données seront synchronisées automatiquement dès que la connexion sera rétablie.',
        badgeColor: 'bg-red-500'
      };
    }

    if (quality === 'poor') {
      return {
        variant: 'default' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Connexion lente',
        message: 'Votre connexion Internet est lente. Certaines opérations peuvent prendre plus de temps.',
        badgeColor: 'bg-yellow-500'
      };
    }

    return {
      variant: 'default' as const,
      icon: <CheckCircle className="h-4 w-4" />,
      title: 'Connecté',
      message: 'Connexion stable.',
      badgeColor: 'bg-green-500'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert variant={statusInfo.variant} className="shadow-lg border">
        <div className="flex items-center gap-2">
          {statusInfo.icon}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{statusInfo.title}</span>
              <Badge variant="secondary" className="text-xs">
                <div className={`w-2 h-2 rounded-full ${statusInfo.badgeColor} mr-1`}></div>
                {quality === 'offline' ? 'Offline' : quality === 'poor' ? 'Lent' : 'Rapide'}
              </Badge>
            </div>
            <AlertDescription className="text-sm mt-1">
              {statusInfo.message}
            </AlertDescription>
            <div className="text-xs text-muted-foreground mt-1">
              Dernière vérification: {lastCheck.toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}
