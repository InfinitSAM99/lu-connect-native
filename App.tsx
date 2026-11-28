import './src/lib/cryptoPolyfill';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import AppLockScreen from './src/screens/AppLockScreen';
import GlobalCallListener from './src/components/GlobalCallListener';
import IncomingCallOverlay from './src/components/IncomingCallOverlay';
import OfflineBanner from './src/components/OfflineBanner';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/PremiumToast';
import { navigationRef } from './src/navigation/navigationRef';
import { initPushNotifications } from './src/lib/notifications';
import { supabase } from './src/lib/supabase';

const queryClient = new QueryClient();

function PushNotificationManager() {
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      console.log('Requesting Push Notification Token for:', profile.id);
      initPushNotifications(profile.id);
    }
  }, [profile?.id]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const actionId = response.actionIdentifier;
      const userText = response.userText;
      const data = response.notification.request.content.data;

      // 1. Handle Quick Reply
      if (actionId === 'reply' && userText) {
        console.log('Reply from notification:', userText);
        const receiverId = data?.referenceId;

        if (receiverId) {
          const { data: authData } = await supabase.auth.getUser();
          const senderId = authData?.user?.id;

          if (senderId) {
            await supabase.from('messages').insert({
              sender_id: senderId,
              receiver_id: receiverId,
              content: userText,
            });
          }
        }
        return; // Stop processing deep links if we just replied
      }

      // 2. Handle Deep Links
      if (data?.link && navigationRef.isReady()) {
        if (data.link.startsWith('/post/')) {
          const postId = data.link.replace('/post/', '');
          navigationRef.navigate('PostDetail', { id: postId });
        }
      }
    });
    return () => subscription.remove();
  }, []);

  return null;
}

export default function App() {
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);

  useEffect(() => {
    const handleDeepLink = async (event: any) => {
      const url = event.url;
      if (!url) return;

      // 1. Handle Auth Callback from Web Login
      if (url.includes('auth-callback')) {
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            const { supabase } = await import('./src/lib/supabase');
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          } catch (e) {
            console.error('Auth callback error:', e);
          }
        }
        return; // Stop processing navigation for auth links
      }

      // 2. Handle Standard Deep Links
      if (!navigationRef.isReady()) return;

      const path = url.replace('https://luconnect.app', '').replace('luconnect://', '');
      const parts = path.split('/').filter(Boolean);

      if (parts[0] === 'profile' && parts[1]) navigationRef.navigate('Profile', { id: parts[1] });
      else if (parts[0] === 'reel' && parts[1]) navigationRef.navigate('Video', { startReelId: parts[1] });
      else if (parts[0] === 'post' && parts[1]) navigationRef.navigate('PostDetail', { id: parts[1] });
      else if (parts[0] === 'reset-password') navigationRef.navigate('ResetPassword');
    };

    const handleInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) handleDeepLink({ url: initialURL });
    };
    handleInitialURL();
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    (async () => {
      const lockEnabled = await AsyncStorage.getItem('pref_app_lock');
      if (lockEnabled === 'true') setIsAppLocked(true);
      setCheckingLock(false);
    })();
  }, []);

  if (checkingLock) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (isAppLocked) return <AppLockScreen onUnlock={() => setIsAppLocked(false)} />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <PushNotificationManager />
            <OfflineBanner />
            <AppNavigator />
            <GlobalCallListener />
            <IncomingCallOverlay />
            <Toast config={toastConfig} />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
