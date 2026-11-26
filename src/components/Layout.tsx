import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import RadialNav from './RadialNav';
import AdminRadialNav from './AdminRadialNav';

export default function Layout({ children }: { children: React.ReactNode }) {
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const { navType } = useAuth(); // Read directly from Global State

  const isAdminRoute = routeName?.startsWith('Admin');
  const isReels = routeName === 'Video';
  
  // Only show radial if it's selected AND not on reels
  const showRadial = !isReels && navType === 'radial';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      
      {showRadial && (isAdminRoute ? <AdminRadialNav /> : <RadialNav />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
});
