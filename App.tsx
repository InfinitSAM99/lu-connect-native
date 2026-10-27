// @ts-nocheck
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import Onboarding from './src/components/Onboarding';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './src/lib/supabase';
import TransferRequestModal from './src/components/TransferRequestModal';
import ForceAvatarModal from './src/components/ForceAvatarModal';
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
  const { data: settings, refetch } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('maintenance, maintenance_message').maybeSingle();
      return data || { maintenance: false, maintenance_message: null };
    },
    refetchInterval: 30000,
  });

  if (settings?.maintenance) {
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
              <AppShell><AppNavigator /><Onboarding /></AppShell>
              <TransferRequestModal />
              <ForceAvatarModal />
            </AlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
// trigger
