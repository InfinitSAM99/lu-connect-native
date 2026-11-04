import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function DeviceBannedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Ionicons name="warning" size={80} color="#ef4444" />
      <Text style={styles.title}>PHONE BANNED</Text>
      <Text style={styles.sub}>
        This phone has been permanently banned due to 3 failed recovery attempts. 
        You cannot log in on this device.
      </Text>

      <View style={styles.btnWrap}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ContactAdmin')}>
          <Ionicons name="chatbubbles" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>CONTACT ADMIN</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.primaryBtn, styles.outlineBtn]} onPress={() => signOut()}>
          <Text style={[styles.primaryBtnText, { color: '#ef4444' }]}>RETURN TO LOGIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24, alignItems: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2, marginTop: 20, marginBottom: 12 },
  sub: { color: '#6d7382', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  btnWrap: { width: '100%', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', padding: 16, borderRadius: 14 },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
