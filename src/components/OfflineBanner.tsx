import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'online' | 'slow' | 'offline'>('online');
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  useEffect(() => {
    const interval = setInterval(async () => {
      const state = await NetInfo.fetch();
      if (!state.isConnected) setStatus('offline');
      else if (state.isConnected && state.isInternetReachable === false) setStatus('slow');
      else if (state.isConnected && state.isInternetReachable === true) {
        if (state.type === 'cellular' && state.details?.cellularGeneration === '2g') setStatus('slow');
        else setStatus('online');
      }
    }, 8000);

    NetInfo.fetch().then(state => {
      if (!state.isConnected) setStatus('offline');
      else if (state.isConnected && state.isInternetReachable === false) setStatus('slow');
      else setStatus('online');
    });

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status !== 'online' && !dismissed) Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    else Animated.timing(slideAnim, { toValue: 100, duration: 250, useNativeDriver: true }).start();
  }, [status, dismissed]);

  if (status === 'online' || dismissed) return null;
  const isSlow = status === 'slow';

  return (
    <Animated.View style={[styles.container, { bottom: insets.bottom + 80, backgroundColor: isSlow ? '#f59e0b' : '#ef4444', transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name={isSlow ? 'speedometer-outline' : 'cloud-offline'} size={20} color="#fff" />
      <Text style={styles.text}>{isSlow ? 'Slow network detected.' : 'You are offline.'}</Text>
      <TouchableOpacity onPress={() => setDismissed(true)} style={{ padding: 4 }}><Ionicons name="close" size={18} color="#fff" /></TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, zIndex: 9999, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, gap: 10, elevation: 10 },
  text: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
});
