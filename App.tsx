// @ts-nocheck
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Application from 'expo-application';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import Onboarding from './src/components/Onboarding';
import DeepLinkListener from './src/components/DeepLinkListener';
import QuickAlertBubbles from './src/components/QuickAlertBubbles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './src/lib/supabase';
import TransferRequestModal from './src/components/TransferRequestModal';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertProvider } from './src/lib/alert';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppShell({ children }: any) {
  const { profile } = useAuth();
  const { data: settings, refetch } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('maintenance, maintenance_message, force_update, latest_apk_url, latest_apk_version').maybeSingle();
      return data || {};
    },
    refetchInterval: 30000,
  });

  // Bypass maintenance and force update for the super admin
  const isAdmin = profile?.email === 'adminsammy@admin.com';
  const currentAppVersion = Application.nativeApplicationVersion || '1.0.0';

  if (settings?.force_update && !isAdmin && settings.latest_apk_version !== currentAppVersion) {
    return <ForceUpdateScreen apkUrl={settings.latest_apk_url} version={settings.latest_apk_version} />;
  }

  if (settings?.maintenance && !isAdmin) {
    return <MaintenanceScreen message={settings.maintenance_message} onRetry={refetch} />;
  }

  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AlertProvider>
              <AppShell><AppNavigator />
      <Onboarding /></AppShell>
              <TransferRequestModal />
              <QuickAlertBubbles />
            </AlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
// trigger
