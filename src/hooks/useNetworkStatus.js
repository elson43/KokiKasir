import { useState, useEffect, useCallback } from 'react';
import { getSyncState, setSyncState as setGlobalSyncState, subscribeSyncState } from '../lib/syncService';

/**
 * useNetworkStatus
 * Melacak navigator.onLine lewat event online/offline dan status sinkronisasi cloud.
 * syncState dibagikan secara global dengan syncService: 'idle' | 'syncing' | 'error'
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncState, setLocalSyncState] = useState(() => getSyncState());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribe = subscribeSyncState(setLocalSyncState);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const setSyncState = useCallback((state) => setGlobalSyncState(state), []);

  return { isOnline, syncState, setSyncState };
}
