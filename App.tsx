import './src/lib/cryptoPolyfill';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import AppLockScreen from './src/screens/AppLockScreen';
import GlobalCallListener from './src/components/GlobalCallListener';
import IncomingCallOverlay from './src/components/IncomingCallOverlay';
import OfflineBanner from './src/components/OfflineBanner';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/PremiumToast';
import { navigationRef } from './src/navigation/navigationRef';

const queryClient = new QueryClient();

export default function App() {
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (event: any) => {
      const url = event.url;
      if (!url || !navigationRef.isReady()) return;

      const path = url.replace('https://luconnect.app', '').replace('luconnect://', '');
      const parts = path.split('/').filter(Boolean);

      if (parts[0] === 'profile' && parts[1]) {
        navigationRef.navigate('Profile', { id: parts[1] });
      } else if (parts[0] === 'reel' && parts[1]) {
        navigationRef.navigate('Video', { startReelId: parts[1] });
      } else if (parts[0] === 'post' && parts[1]) {
        navigationRef.navigate('PostViewerScreen', { postId: parts[1] });
      } else if (parts[0] === 'reset-password') {
        navigationRef.navigate('ResetPassword');
      }
    };

    const handleInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) handleDeepLink({ url: initialURL });
    };

    handleInitialURL();
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  // App Lock check
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
