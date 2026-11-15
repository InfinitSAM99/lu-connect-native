import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminPlaceholderScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.content}>
        <Ionicons name="construct" size={64} color="#ef4444" />
        <Text style={styles.title}>{route.name.replace('Admin', '')}</Text>
        <Text style={styles.sub}>This module is coming soon in the native app.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 20, marginBottom: 10 },
  sub: { color: '#6d7382', fontSize: 14, textAlign: 'center' },
});
