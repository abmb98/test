import { useState, useEffect } from 'react';
import { checkConnectionQuality, isOnline } from '@/lib/firebase';

interface NetworkStatus {
  isOnline: boolean;
  quality: 'good' | 'poor' | 'offline';
  lastCheck: Date;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: isOnline(),
    quality: 'good',
    lastCheck: new Date()
  });

  useEffect(() => {
    const updateNetworkStatus = async () => {
      const online = isOnline();
      const quality = await checkConnectionQuality();
      
      setNetworkStatus({
        isOnline: online,
        quality,
        lastCheck: new Date()
      });
    };

    // Initial check
    updateNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        quality: 'offline',
        lastCheck: new Date()
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection quality check
    const interval = setInterval(updateNetworkStatus, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return networkStatus;
};
