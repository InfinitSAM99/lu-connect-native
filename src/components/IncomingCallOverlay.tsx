import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LULogo from './LULogo';
import { tapLight } from '../lib/haptics';
import { useCallStore } from '../lib/globalState';
import { navigate } from '../navigation/navigationRef';
import { supabase } from '../lib/supabase';

export default function IncomingCallOverlay() {
  const insets = useSafeAreaInsets();
  const { incomingCallVisible: visible, incomingCaller: caller, setIncomingCall } = useCallStore();
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      Animated.timing(slideAnim, { toValue: -400, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible || !caller) return null;

  const avatarUrl = caller?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${caller?.full_name || 'User'}`;

  const handleAccept = async () => {
    tapLight();
    if (caller.callId) {
      await supabase.from('active_calls').update({ status: 'accepted' }).eq('id', caller.callId);
    }
    setIncomingCall(false, null);
    navigate('AudioCallScreen', { otherUser: caller, isIncoming: true, callId: caller.callId });
  };

  const handleDecline = async () => {
    tapLight();
    if (caller.callId) {
      await supabase.from('active_calls').update({ status: 'declined' }).eq('id', caller.callId);
    }
    setIncomingCall(false, null);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="none" presentationStyle="overFullScreen">
      <Animated.View style={[styles.container, { paddingTop: insets.top + 20, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['rgba(239,68,68,0.95)', '#000000', '#000000']} style={StyleSheet.absoluteFillObject} />
        
        <View style={styles.topBranding}>
          <LULogo size={32} animate={false} />
          <Text style={styles.brandTitle}>LU CALL</Text>
        </View>

        <View style={styles.callerInfo}>
          <Animated.Image source={{ uri: avatarUrl }} style={[styles.avatar, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.callerName}>{caller?.full_name || 'Unknown'}</Text>
          <Text style={styles.callType}>Incoming Audio Call...</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionWrapper}>
            <TouchableOpacity style={[styles.circleBtn, { backgroundColor: '#ef4444' }]} onPress={handleDecline}>
              <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.actionText}>Decline</Text>
          </View>
          <View style={styles.actionWrapper}>
            <TouchableOpacity style={[styles.circleBtn, { backgroundColor: '#22c55e' }]} onPress={handleAccept}>
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionText}>Accept</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, justifyContent: 'space-between', alignItems: 'center', paddingBottom: 60, backgroundColor: '#000' },
  topBranding: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  callerInfo: { alignItems: 'center', marginTop: 60 },
  avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#fff', marginBottom: 20 },
  callerName: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  callType: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%' },
  actionWrapper: { alignItems: 'center', gap: 12 },
  circleBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
