import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

export default function QuickAlertBubbles() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [signalType, setSignalType] = useState<'message' | 'notification' | null>(null);
  const [previewText, setPreviewText] = useState('');

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-50); // Starts slightly higher
  
  const spotlightOpacity = useSharedValue(0);
  const spotlightScale = useSharedValue(0.9);

  useEffect(() => {
    if (!profile?.id) return;
    if (profile.alerts_enabled === false) return;

    const msgChannel = supabase.channel(`quick-msg-${profile.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        if (payload.new.sender_id !== profile.id) { runOnJS(setPreviewText)(payload.new.content || 'New message'); trigger('message'); }
      });

    const notifChannel = supabase.channel(`quick-notif-${profile.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
        { runOnJS(setPreviewText)('New activity'); trigger('notification'); }
      });

    const t1 = setTimeout(() => msgChannel.subscribe(), 100);
    const t2 = setTimeout(() => notifChannel.subscribe(), 100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [profile?.id]);

  const trigger = (type: 'message' | 'notification') => {
    if (profile?.alerts_enabled === false) return;
    runOnJS(setSignalType)(type);

    opacity.value = 0;
    translateY.value = -50;
    spotlightOpacity.value = 0;
    spotlightScale.value = 0.9;

    // Pill drops in
    opacity.value = withTiming(1, { duration: 250 });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(2)) });

    // Spotlight breathes
    spotlightOpacity.value = withSequence(
      withTiming(0.7, { duration: 300 }), 
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800 }), 
          withTiming(0.5, { duration: 800 })  
        ),
        2,
        true
      ),
      withTiming(0, { duration: 400 }) 
    );

    spotlightScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      2,
      true
    );

    // Auto-dismiss
    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-50, { duration: 400 });
      setTimeout(() => runOnJS(setSignalType)(null), 400);
    }, 2500);
  };

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const spotlightStyle = useAnimatedStyle(() => ({
    opacity: spotlightOpacity.value,
    transform: [{ scale: spotlightScale.value }],
  }));

  if (!signalType) return null;

  const isMessage = signalType === 'message';
  const themeColor = '#ef4444'; 
  const iconName = isMessage ? 'mail' : 'notifications';
  const pillText = previewText || (isMessage ? 'New message' : 'New activity');

  return (
    <View 
      pointerEvents="none" 
      style={[
        styles.container, 
        // Pushes the whole alert to the very top, just below the status bar
        { top: insets.top > 0 ? insets.top + 10 : 40 } 
      ]}
    >
      
      {/* SPOTLIGHT EFFECT */}
      <Animated.View style={[styles.spotlightWrapper, spotlightStyle]}>
        <LinearGradient
          colors={[themeColor, 'transparent']}
          style={styles.spotlightGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* THE PILL (Floating, not touching edges) */}
      <Animated.View style={[styles.pill, pillStyle]}>
        
        <View style={[styles.iconContainer, { backgroundColor: themeColor }]}>
          <Ionicons name={iconName} size={16} color="#fff" />
        </View>
        
        <Text style={styles.text}>{pillText}</Text>
      </Animated.View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 9999,
  },
  spotlightWrapper: {
    position: 'absolute',
    top: -SCREEN_W * 0.6, // Pushed up even higher so the curve is at the top
    width: SCREEN_W * 2, 
    height: SCREEN_W * 1.2, 
    left: -(SCREEN_W / 2), 
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  spotlightGradient: {
    width: '100%',
    height: '100%',
    borderRadius: SCREEN_W, 
  },
  
  // Pill floating style (Not touching corners)
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    // No width: 100% here, so it stays a compact pill
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    paddingRight: 8,
  },
});
