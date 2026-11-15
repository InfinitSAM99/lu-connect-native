import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function SubscriptionScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isPremium = profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'elite';

  const handleSubscribe = async () => {
    if (!phone.trim() || phone.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Enter a valid M-Pesa number (e.g., 0712345678)' });
      return;
    }

    setLoading(true);
    try {
      // 1. Trigger the M-Pesa STK Push via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: { phone, amount: 1, userId: profile?.id } // Amount is 1 KES for testing, change to 299 later
      });

      if (error) throw error;

      // 2. Show success message
      Toast.show({ type: 'success', text1: 'Check your phone', text2: 'Enter your M-Pesa PIN to complete the payment.' });
      
      // 3. Wait 15 seconds then reload the profile to check if premium activated
      setTimeout(async () => {
        await reloadProfile();
        Toast.show({ type: 'success', text1: 'Welcome to LU Pro!' });
        navigation.goBack();
      }, 15000);

    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Payment Failed', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LU PRO</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HERO SECTION */}
        <View style={styles.hero}>
          <LinearGradient colors={['rgba(255,215,0,0.3)', 'transparent']} style={styles.heroGlow} />
          <View style={styles.diamondWrap}>
            <LinearGradient colors={['#FFDF00', '#D4AF37']} style={styles.diamondBg}>
              <Ionicons name="diamond" size={48} color="#000" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Unlock LU Pro</Text>
          <Text style={styles.subtitle}>Elevate your campus experience with exclusive premium features.</Text>
        </View>

        {/* FEATURES LIST */}
        <View style={styles.featuresWrap}>
          <FeatureRow icon="color-palette" title="13 Premium Chat Themes" desc="Blur, brightness, and saturation controls." />
          <FeatureRow icon="phone-portrait" title="Custom App Icons" desc="Change your app icon to Gold, Dark, or VIP." />
          <FeatureRow icon="musical-notes" title="Exclusive Ringtones" desc="Stand out with premium notification sounds." />
          <FeatureRow icon="ribbon" title="Gold Profile Ring" desc="A spinning gold ring around your avatar." />
          <FeatureRow icon="eye-off" title="Disappearing Messages" desc="Set 12h, 24h, or 30-day timers for chats." />
        </View>

        {/* PRICING & PAYMENT */}
        {isPremium ? (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
            <Text style={styles.activeTitle}>You are a Pro Member</Text>
            <Text style={styles.activeSub}>Your subscription is active until {new Date(profile.premium_until).toLocaleDateString()}</Text>
          </View>
        ) : (
          <View style={styles.paymentBox}>
            <Text style={styles.priceTitle}>Only KES 299 / month</Text>
            <Text style={styles.priceSub}>Pay securely via M-Pesa</Text>
            
            <TextInput
              style={styles.input}
              placeholder="M-Pesa Number (e.g., 0712345678)"
              placeholderTextColor="#6d7382"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <TouchableOpacity onPress={handleSubscribe} disabled={loading} style={styles.payBtn}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.payText}>Pay with M-Pesa</Text>}
            </TouchableOpacity>
            <Text style={styles.terms}>Subscription renews monthly. Cancel anytime.</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function FeatureRow({ icon, title, desc }: any) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={22} color="#FFD700" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { color: '#FFD700', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  
  hero: { alignItems: 'center', paddingVertical: 30, position: 'relative' },
  heroGlow: { position: 'absolute', top: -50, left: -50, right: -50, height: 300, borderRadius: 150, opacity: 0.5 },
  diamondWrap: { shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 10, marginBottom: 16 },
  diamondBg: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 30, lineHeight: 20 },

  featuresWrap: { paddingHorizontal: 20, gap: 16, marginTop: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#0a0a0a', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  featureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,215,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  featureDesc: { color: '#6d7382', fontSize: 12, marginTop: 2 },

  paymentBox: { marginHorizontal: 20, marginTop: 30, backgroundColor: '#0a0a0a', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  priceTitle: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  priceSub: { color: '#FFD700', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  input: { backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  payBtn: { backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  payText: { color: '#000', fontSize: 16, fontWeight: '900' },
  terms: { color: '#6d7382', fontSize: 11, textAlign: 'center', marginTop: 12 },

  activeBox: { marginHorizontal: 20, marginTop: 30, backgroundColor: 'rgba(34,197,94,0.1)', padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#22c55e' },
  activeTitle: { color: '#22c55e', fontSize: 20, fontWeight: '800', marginTop: 12 },
  activeSub: { color: '#fff', fontSize: 13, textAlign: 'center', marginTop: 6 },
});
