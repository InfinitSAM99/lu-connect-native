import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import { View, Text } from 'react-native';

function Root() {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff' }}>Loading...</Text>
    </View>;
  }

  // If not logged in, show the login screen
  if (!session) return <LoginScreen />;

  // If logged in, show a placeholder for now
  return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff', fontSize: 18 }}>Logged in! Home screen coming soon.</Text>
  </View>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
