import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UpdateBanner({ version, url, onDismiss }: { version: string, url: string, onDismiss: () => void }) {
  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-download" size={20} color="#000" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Update Available</Text>
        <Text style={styles.sub}>Version {version} is ready.</Text>
      </View>
      <TouchableOpacity 
        style={styles.btn} 
        onPress={() => Linking.openURL(url)}
      >
        <Text style={styles.btnText}>UPDATE</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
        <Ionicons name="close" size={20} color="#6d7382" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', 
    padding: 12, marginHorizontal: 16, marginTop: 10, borderRadius: 12, 
    borderWidth: 1, borderColor: '#ef4444' 
  },
  iconWrap: { 
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef4444', 
    alignItems: 'center', justifyContent: 'center', marginRight: 10 
  },
  title: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sub: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  btn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  closeBtn: { padding: 4 }
});
