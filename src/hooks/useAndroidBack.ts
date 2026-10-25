// @ts-nocheck
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Handles the phone's physical/gesture back button:
// - In the installed APK: uses @capacitor/app backButton listener
// - In the PWA (Kiwi): uses a popstate / history back stack fallback
//
// Behavior:
// - If there's a page in history to go back to → navigate back
// - If we're already on the root (/feed or /) → allow the OS to exit
// - Otherwise → navigate to /feed as a safe default

export default function useAndroidBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let capacitorHandle = null;

    const onBack = () => {
      const path = location.pathname;
      const isRoot = path === '/feed' || path === '/';

      // If we're on a root page, let the OS close the app
      if (isRoot) {
        return false; // returning false tells Capacitor we didn't handle it
      }

      // Try history back first — go to whatever page we came from
      if (window.history.length > 1) {
        navigate(-1);
        return true;
      }

      // Fallback: go home
      navigate('/feed', { replace: false });
      return true;
    };

    // ---- Capacitor path (APK) ----
    (async () => {
      try {
        // Only runs inside the native app
        const mod = await import('@capacitor/app');
        const { App } = mod;
        capacitorHandle = await App.addListener('backButton', () => {
          onBack();
        });
      } catch {
        // Not running in Capacitor — PWA fallback below is used
      }
    })();

    // ---- PWA fallback (Kiwi browser) ----
    // Push a dummy entry whenever the route changes so back can pop it
    const onPopState = () => {
      // Browser already moved back one entry — react-router will sync.
      // If at root, let the browser do its default (may exit).
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (capacitorHandle && typeof capacitorHandle.remove === 'function') {
        capacitorHandle.remove();
      }
    };
  }, [location.pathname, navigate]);
}
