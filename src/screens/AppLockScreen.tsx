import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import LULogo from '../components/LULogo';
import { tapLight, tapHeavy } from '../lib/haptics';

export default function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const authenticate = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError('');

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      
      if (!hasHardware || securityLevel === LocalAuthentication.SecurityLevel.NONE) {
        setError('No screen lock set up. Please set a PIN or Fingerprint in your phone settings.');
        setIsAuthenticating(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LU Connect',
        fallbackLabel: 'Use Device Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        requireConfirmation: true,
      });

      if (result.success) {
        tapLight();
        onUnlock();
      } else {
        tapHeavy();
        setError('Authentication failed. Try again.');
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }
    } catch (e) {
      setError('Something went wrong.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    setTimeout(authenticate, 500);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(255,215,0,0.1)', '#000', '#000']} style={StyleSheet.absoluteFillObject} />
      
      <Animated.View style={[styles.content, { transform: [{ translateX: shakeAnim }] }]}>
        <LULogo size={80} animate={true} />
        <Text style={styles.title}>LU Connect is Locked</Text>
        <Text style={styles.subtitle}>Verify your identity to continue</Text>

        <TouchableOpacity style={styles.fingerprintWrap} onPress={authenticate} disabled={isAuthenticating}>
          <View style={styles.fingerprintCircle}>
            <Ionicons name="finger-print" size={64} color="#FFD700" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.goldBtn} onPress={authenticate} disabled={isAuthenticating}>
          <Ionicons name="shield-checkmark" size={22} color="#000" />
          <Text style={styles.goldBtnText}>{isAuthenticating ? 'Verifying...' : 'Unlock Now'}</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', padding: 40, width: '100%' },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 24 },
  subtitle: { color: '#a1a1aa', fontSize: 15, marginTop: 8, marginBottom: 30 },
  fingerprintWrap: { marginBottom: 30 },
  fingerprintCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,215,0,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,215,0,0.3)' },
  goldBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFD700', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30, width: '100%', shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 15 },
  goldBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },
  error: { color: '#ef4444', fontSize: 14, marginTop: 20, fontWeight: '600', textAlign: 'center' },
});
