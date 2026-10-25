import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GRACE_MS = 180 * 1000;

function isComplete(profile: any) {
  if (!profile) return true;
  if (profile.is_bot) return true;
  return Boolean(profile.avatar_url && profile.full_name && profile.faculty && profile.course && profile.year_of_study && profile.university_id);
}

export default function ProfileNudge() {
  const { profile, signOut } = useAuth();
  const navigation = useNavigation();
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const [expired, setExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const pan = useRef(new Animated.ValueXY({ x: 16, y: SCREEN_H * 0.18 })).current;

  const complete = isComplete(profile);

  useEffect(() => {
    if (complete || profile?.profile_nudge_deadline) return;
    const deadline = new Date(Date.now() + GRACE_MS).toISOString();
    supabase.from('profiles').update({ profile_nudge_deadline: deadline }).eq('id', profile.id).then();
  }, [profile?.id, complete]);

  useEffect(() => {
    if (complete) { setExpired(false); return; }
    const deadline = profile?.profile_nudge_deadline ? new Date(profile.profile_nudge_deadline).getTime() : null;
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setExpired(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [profile?.profile_nudge_deadline, complete]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => { pan.flattenOffset(); },
  })).current;

  // Don't show on edit/terms screens or if complete
  if (complete) return null;
  if (routeName === 'ProfileEdit' || routeName === 'Login' || routeName === 'Register') return null;

  // Block screen when expired
  if (expired || secondsLeft === 0) {
    return (
      <View style={styles.blocker}>
        <View style={styles.blockerIcon}><Ionicons name="person" size={44} color="#fff" /></View>
        <Text style={styles.blockerTitle}>Complete your profile</Text>
        <Text style={styles.blockerSub}>Please finish setting up your account to continue.</Text>
        <Animated.View style={[styles.buttonWrapper, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} {...panResponder.panHandlers}>
          <View style={styles.blockerCta} onTouchEnd={() => navigation.navigate('ProfileEdit')}>
            <Text style={styles.blockerCtaText}>Update my profile</Text>
          </View>
        </Animated.View>
        <Animated.View style={{ marginTop: 16 }} onTouchEnd={async () => await signOut()}>
          <Text style={{ color: '#6d7382', fontSize: 13 }}>Log out</Text>
        </Animated.View>
      </View>
    );
  }

  // Show draggable timer pill
  if (routeName !== 'Feed') return null;
  const mm = Math.floor((secondsLeft || 0) / 60);
  const ss = String((secondsLeft || 0) % 60).padStart(2, '0');
  const urgent = (secondsLeft || 0) <= 30;

  return (
    <Animated.View 
      style={[
        styles.pill, 
        { 
          transform: pan.getTranslateTransform(), 
          borderColor: urgent ? '#ef4444' : 'rgba(255,255,255,0.15)',
          backgroundColor: 'rgba(20,20,20,0.95)' 
        }
      ]} 
      {...panResponder.panHandlers}
    >
      <View style={styles.pillContent} onTouchEnd={() => navigation.navigate('ProfileEdit')}>
        <View style={[styles.pillIcon, urgent && { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
          <Ionicons name="alert-circle" size={20} color={urgent ? '#ef4444' : '#fff'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pillText}>Complete your profile</Text>
          <Text style={[styles.timer, urgent && { color: '#ef4444' }]}>{mm}:{ss} remaining</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#6d7382" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 280,
    zIndex: 4000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  timer: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6d7382',
    marginTop: 2,
  },
  blocker: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 5000, alignItems: 'center', justifyContent: 'center', padding: 32 },
  blockerIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  blockerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
  blockerSub: { fontSize: 14, color: '#6d7382', textAlign: 'center', maxWidth: 300, lineHeight: 22, marginBottom: 32 },
  buttonWrapper: { width: '100%', maxWidth: 340, alignItems: 'center' },
  blockerCta: { backgroundColor: '#ef4444', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, width: '100%', alignItems: 'center' },
  blockerCtaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
