import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import RadialNav from './RadialNav';
import AdminRadialNav from './AdminRadialNav';

export default function Layout({ children }: { children: React.ReactNode }) {
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  
  const isAdminRoute = routeName?.startsWith('Admin');
  const isReels = routeName === 'Video';
return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      {!isReels && (isAdminRoute ? <AdminRadialNav /> : <RadialNav />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
});
