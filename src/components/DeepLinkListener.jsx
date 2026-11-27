import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';

export default function DeepLinkListener() {
  useEffect(() => {
    let listenerHandle = null;

    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('appUrlOpen', async (event) => {
        const url = event.url;
        console.log('App opened with URL:', url);

        if (url.includes('callback') || url.includes('code=')) {
          try { await Browser.close(); } catch (e) {}

          // The URL is something like: com.luconnect.admin://callback?code=xxx
          // We extract the query string to get the code
          const hashIndex = url.indexOf('?');
          if (hashIndex > -1) {
            const query = url.substring(hashIndex + 1);
            const params = new URLSearchParams(query);
            const code = params.get('code');

            if (code) {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              
              if (error) {
                console.error('Supabase Auth Error:', error.message);
                window.dispatchEvent(new Event('auth-failed'));
              } else {
                // The session is now saved. The AuthContext will automatically 
                // detect this via onAuthStateChange!
                console.log('Successfully authenticated!');
                window.dispatchEvent(new Event('auth-success'));
              }
            }
          }
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return null;
}
