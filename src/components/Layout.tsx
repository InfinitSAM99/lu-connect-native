import React from 'react';
import { View, StyleSheet } from 'react-native';
import RadialNav from './RadialNav';
import ProfileNudge from './ProfileNudge';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      <ProfileNudge />
      <RadialNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
});
