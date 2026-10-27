import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STEPS = [
  {
    icon: 'sparkles',
    title: 'Welcome to LU Connect',
    text: 'The social network built for Kenyan university students. Here is a quick tour.',
    spotlight: null,
  },
  {
    icon: 'apps',
    title: 'The Radial Nav',
    text: 'Tap the LU logo at the bottom of your screen to access everything — Profile, Notifications, Messages, and more.',
    spotlight: { bottom: 20, size: 70, align: 'center' },
  },
  {
    icon: 'home',
    title: 'Your Feed',
    text: 'Scroll through posts from your university and beyond. Like, comment, and share with one tap.',
    spotlight: { top: 120, size: 200, align: 'center' },
  },
  {
    icon: 'chatbubble',
    title: 'Real-time Messages',
    text: 'Chat privately with anyone. Blue ticks show they read it. Red pulses alert you to new messages.',
    spotlight: null,
  },
  {
    icon: 'trophy',
    title: 'The Hall of Fame',
    text: 'Most liked? Most followed? Most connected? Winners get featured on the Hall of Fame page all year.',
    spotlight: null,
  },
  {
    icon: 'rocket',
    title: 'You are ready',
    text: 'Explore events, reels, marketplace, groups, and more. Tap the LU button whenever you need to navigate.',
    spotlight: null,
  },
];

export default function Onboarding() {
  const { profile, setProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Show only for users who haven't completed onboarding
  useEffect(() => {
    if (!profile?.id) return;
    if (profile.onboarding_completed_at) return;
    setTimeout(() => {
      setShow(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 1500);
  }, [profile?.id, profile?.onboarding_completed_at]);

  const finish = async () => {
    if (!profile?.id) return;
    // Save to DB so it never shows again
    await supabase.from('profiles').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', profile.id);
    if (setProfile) setProfile({ ...profile, onboarding_completed_at: new Date().toISOString() });
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setShow(false));
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else finish();
  };

  const skip = () => finish();

  if (!show) return null;

  const step = STEPS[currentStep];

  return (
    <Modal transparent animationType="none" visible={show} onRequestClose={skip}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Spotlight hole */}
        {step.spotlight && (
          <View
            style={{
              position: 'absolute',
              top: step.spotlight.top || undefined,
              bottom: step.spotlight.bottom || undefined,
              width: step.spotlight.size,
              height: step.spotlight.size,
              borderRadius: step.spotlight.size / 2,
              left: step.spotlight.align === 'center' ? (SCREEN_W - step.spotlight.size) / 2 : undefined,
              backgroundColor: 'rgba(239,68,68,0.2)',
              borderWidth: 2,
              borderColor: '#ef4444',
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 20,
            }}
          />
        )}

        {/* Content card */}
        <View style={[styles.card, { top: step.spotlight ? insets.top + 20 : SCREEN_H * 0.25 }]}>
          <View style={styles.iconWrap}>
            <Ionicons name={step.icon as any} size={40} color="#ef4444" />
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.text}>{step.text}</Text>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={skip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.nextBtn}>
              <Text style={styles.nextText}>
                {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  card: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  text: { color: '#aab0bd', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1f1f1f' },
  dotActive: { backgroundColor: '#ef4444', width: 24 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, justifyContent: 'center' },
  skipText: { color: '#6d7382', fontSize: 14, fontWeight: '600' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
