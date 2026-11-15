import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import TopBar from '../components/TopBar';
import Toast from 'react-native-toast-message';
import { tapLight, tapHeavy } from '../lib/haptics';

export default function BiometricSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('pref_app_lock');
      setEnabled(saved === 'true');
      setLoading(false);
    })();
  }, []);

  const toggleLock = async (val: boolean) => {
    tapLight();
    if (val) {
      // Verify real Android biometrics / PIN before enabling
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
          Toast.show({ type: 'error', text1: 'Not Supported', text2: 'Your device does not support biometrics.' });
          return;
        }

        const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
        if (securityLevel === LocalAuthentication.SecurityLevel.NONE) {
          Toast.show({ type: 'error', text1: 'No Screen Lock', text2: 'Please set up a PIN, Pattern, or Fingerprint in your phone settings first.' });
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable LU Connect App Lock',
          fallbackLabel: 'Use Device Passcode',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
          requireConfirmation: true,
        });

        if (!result.success) {
          tapHeavy();
          return;
        }
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
        return;
      }
    }

    setEnabled(val);
    await AsyncStorage.setItem('pref_app_lock', val.toString());
    Toast.show({ type: 'success', text1: val ? 'App Lock Enabled' : 'App Lock Disabled' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="App Lock" showBack={true} onBack={() => navigation.goBack()} />
      
      <View style={{ padding: 20 }}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={64} color="#22c55e" />
        </View>
        
        <Text style={styles.title}>Secure your Chats</Text>
        <Text style={styles.desc}>
          When App Lock is enabled, LU Connect will require your real Android security (Face ID, Fingerprint, or Phone PIN) every time you open the app.
        </Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>App Lock</Text>
            <Text style={styles.rowSub}>Uses your phone's native security</Text>
          </View>
          <Switch 
            value={enabled} 
            onValueChange={toggleLock} 
            trackColor={{ false: '#1f1f1f', true: '#22c55e' }} 
            thumbColor="#fff"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#6d7382" />
          <Text style={styles.infoText}>
            LU Connect never sees your biometric data. It is securely handled by your phone's operating system.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  desc: { color: '#a1a1aa', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rowSub: { color: '#6d7382', fontSize: 13, marginTop: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24, paddingHorizontal: 10 },
  infoText: { color: '#6d7382', fontSize: 13, flex: 1, lineHeight: 18 },
});
