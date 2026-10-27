import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MaintenanceScreen({ message, onRetry }: any) {
  const insets = useSafeAreaInsets();
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotating gear
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Fade in content
    Animated.timing(fade, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.content, { opacity: fade }]}>
        <View style={styles.iconWrap}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View style={styles.glowRing} />
          </Animated.View>
          <Animated.View style={{ transform: [{ rotate: spin }], position: 'absolute' }}>
            <Ionicons name="settings-sharp" size={72} color="#ef4444" />
          </Animated.View>
        </View>

        <Text style={styles.title}>Under Maintenance</Text>
        <Text style={styles.subtitle}>
          {message || 'LU Connect is being upgraded. We will be back online shortly.'}
        </Text>

        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>

        <TouchableOpacity onPress={onRetry} style={styles.btn}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL('mailto:samuelmugasia1@gmail.com?subject=LU%20Connect%20Support%20Request')} style={styles.supportBtn}>
          <Text style={styles.supportText}>Contact Support</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.footer}>LU CONNECT · Kenya</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { alignItems: 'center', width: '100%', maxWidth: 400 },
  iconWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  glowRing: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 2, borderColor: 'rgba(239,68,68,0.35)' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  subtitle: { color: '#6d7382', fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 12, marginBottom: 32 },
  progressBar: { width: '100%', height: 4, backgroundColor: '#1f1f1f', borderRadius: 2, overflow: 'hidden', marginBottom: 32 },
  progressFill: { width: '60%', height: '100%', backgroundColor: '#ef4444', borderRadius: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, width: '100%', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  supportBtn: { marginTop: 16, padding: 12 },
  supportText: { color: '#6d7382', fontSize: 13, fontWeight: '500' },
  footer: { position: 'absolute', bottom: 24, color: '#3b1215', fontSize: 11, letterSpacing: 2, fontWeight: '600' },
});
