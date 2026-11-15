// @ts-nocheck
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/**
 * Returns { online, connectionType }.
 * Uses the native Network plugin on Android, falls back to
 * navigator.onLine on web.
 */
export default function useNetworkStatus() {
  const isNative = Capacitor.isNativePlatform();
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    if (isNative) {
      let listenerHandle = null;

      const init = async () => {
        try {
          const status = await Network.getStatus();
          setOnline(status.connected);
          setConnectionType(status.connectionType || 'unknown');

          listenerHandle = await Network.addListener('networkStatusChange', (s) => {
            setOnline(s.connected);
            setConnectionType(s.connectionType || 'unknown');
          });
        } catch (e) {
          console.warn('Network plugin init failed:', e.message);
        }
      };

      init();

      return () => {
        if (listenerHandle && listenerHandle.remove) {
          listenerHandle.remove();
        }
      };
    }

    // Web fallback
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [isNative]);

  return { online, connectionType };
}
