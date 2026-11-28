import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UpdatePill({ version, url }: { version: string, url: string }) {
  return (
    <TouchableOpacity 
      style={styles.pill} 
      activeOpacity={0.8}
      onPress={() => Linking.openURL(url)}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-download" size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>LU CONNECT {version}</Text>
        <Text style={styles.sub}>Tap to install new version</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ef4444" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a', // dark grey background
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 0, // 🔥 NO RED BORDER
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ef4444', // 🔥 RED ICON
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  title: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sub: { color: '#6d7382', fontSize: 11, marginTop: 1 },
});
