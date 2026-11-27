import { useState, useEffect } from 'react';

/**
 * useNetworkStatus
 * Tracks navigator.onLine via window online/offline events.
 * syncState is controlled externally (set via the returned setSyncState).
 * syncState: 'idle' | 'syncing' | 'error'
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'syncing' | 'error'

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncState('idle');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, syncState, setSyncState };
}
