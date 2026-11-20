import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import TopBar from '../components/TopBar';

const FEATURES = [
  { icon: 'chatbubbles', title: 'Exclusive Stickers', desc: 'Send custom reactions and stickers' },
  { icon: 'color-palette', title: 'Custom App Icons', desc: 'Change your icon to stand out' },
  { icon: 'notifications', title: 'Exclusive Ringtones', desc: 'Set custom call sounds for your close friends' },
  { icon: 'pin', title: 'Pin Extra Chats', desc: 'Pin up to 10 conversations to the top' },
  { icon: 'happy', title: 'Default Reactions', desc: 'Choose your default emoji for double-taps' },
  { icon: 'time', title: 'Focus Schedules', desc: 'Mute or hide chats on a custom schedule' },
];

export default function SubscriptionScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState<'core' | 'premium'>('core');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);

  const isPremium = profile?.subscription_tier === 'premium';

  useEffect(() => {
    // Read directly from the profile object (which we saved to in PaymentMethodsScreen)
    if (profile?.mpesa_number) {
      setPhoneNumber(profile.mpesa_number);
      setSavedPhone(profile.mpesa_number);
    }
  }, [profile]);

  const handleSubscribe = async () => {
    if (!savedPhone && phoneNumber.length < 9) {
      return Toast.show({ type: 'error', text1: 'Invalid Number', text2: 'Please enter a valid M-Pesa number.' });
    }

    setLoading(true);
    try {
      let cleanedPhone = (savedPhone || phoneNumber).replace(/\s/g, '');
      if (cleanedPhone.startsWith('0')) cleanedPhone = '254' + cleanedPhone.slice(1);
      if (cleanedPhone.startsWith('+')) cleanedPhone = cleanedPhone.slice(1);

      const amount = selectedPlan === 'core' ? 759 : 2999;
      const purpose = 'lu_pro';
      const metadata = { plan: selectedPlan, category: 'subscription', duration_days: selectedPlan === 'core' ? 30 : 150 };

      const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
        body: { phone: cleanedPhone, amount, purpose, user_id: profile.id, metadata }
      });

      if (error) throw error;
      if (data?.success || data?.ResponseCode === '0') {
        Toast.show({ type: 'success', text1: 'STK Push Sent', text2: 'Check your phone for the M-Pesa PIN prompt.' });
      } else {
        throw new Error(data?.error || 'Payment initiation failed');
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Payment Failed', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <LinearGradient colors={['rgba(255,215,0,0.1)', '#000000', '#000000']} style={StyleSheet.absoluteFillObject} />
      <TopBar title="LU Pro" showBack={true} onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        
        {isPremium && (
          <View style={styles.premiumBanner}>
            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>You are a LU Pro Member</Text>
              <Text style={{ color: '#a1a1aa', fontSize: 13 }}>Your benefits are active.</Text>
            </View>
          </View>
        )}

        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,215,0,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="diamond" size={48} color="#FFD700" />
          </View>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>LU Pro</Text>
          <Text style={{ color: '#a1a1aa', fontSize: 15, textAlign: 'center', marginTop: 8 }}>More features to connect, create and stand out.</Text>
        </View>

        <Text style={styles.sectionHeader}>CHOOSE YOUR PLAN</Text>
        
        <TouchableOpacity 
          style={[styles.planCard, selectedPlan === 'core' && styles.planCardActive, isPremium && { opacity: 0.5 }]} 
          onPress={() => { if (!isPremium) setSelectedPlan('core'); }} disabled={isPremium}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Core</Text>
            <Ionicons name={selectedPlan === 'core' ? "radio-button-on" : "radio-button-off"} size={24} color={selectedPlan === 'core' ? "#FFD700" : "#6d7382"} />
          </View>
          <Text style={styles.planPrice}>KES 759.00/month</Text>
          <Text style={styles.planDesc}>Express yourself in new ways</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.planCard, selectedPlan === 'premium' && styles.planCardActive, isPremium && { opacity: 0.5 }]} 
          onPress={() => { if (!isPremium) setSelectedPlan('premium'); }} disabled={isPremium}
        >
          <View style={styles.bestValueBadge}><Text style={styles.bestValueText}>BEST VALUE</Text></View>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Premium</Text>
            <Ionicons name={selectedPlan === 'premium' ? "radio-button-on" : "radio-button-off"} size={24} color={selectedPlan === 'premium' ? "#FFD700" : "#6d7382"} />
          </View>
          <Text style={styles.planPrice}>KES 2,999.00/month</Text>
          <Text style={styles.planDesc}>Expand the possibilities with expanded AI usage</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>WHAT YOU GET</Text>
        <View style={styles.featureBox}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureRow, i !== FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }]}>
              <View style={styles.featureIconWrap}><Ionicons name={f.icon as any} size={22} color="#FFD700" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isPremium && (
          <>
            <Text style={styles.sectionHeader}>PAYMENT METHOD</Text>
            {savedPhone ? (
              <View style={styles.mpesaBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,215,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="phone-portrait" size={20} color="#FFD700" />
                    </View>
                    <View><Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>M-Pesa</Text><Text style={{ color: '#6d7382', fontSize: 13, marginTop: 2 }}>{savedPhone}</Text></View>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('PaymentMethodsScreen')}><Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '600' }}>Change</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('PaymentMethodsScreen')}>
                <Ionicons name="alert-circle-outline" size={24} color="#FFD700" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 12, flex: 1 }}>Link your phone number first</Text>
                <Ionicons name="chevron-forward" size={20} color="#6d7382" />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {!isPremium && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={handleSubscribe} disabled={loading}>
            <LinearGradient colors={['#FFDF00', '#D4AF37']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subscribeBtn}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.subscribeBtnText}>Subscribe for KES {selectedPlan === 'core' ? '759' : '2,999'}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  premiumBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.15)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#22c55e', marginBottom: 20 },
  sectionHeader: { color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginTop: 20 },
  planCard: { backgroundColor: '#141414', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  planCardActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { color: '#fff', fontSize: 20, fontWeight: '800' }, planPrice: { color: '#FFD700', fontSize: 16, fontWeight: '700', marginBottom: 4 }, planDesc: { color: '#a1a1aa', fontSize: 13 },
  bestValueBadge: { position: 'absolute', top: -10, right: 20, backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, bestValueText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  featureBox: { backgroundColor: '#141414', borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  featureIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,215,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: '#fff', fontSize: 15, fontWeight: '600' }, featureDesc: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  mpesaBox: { backgroundColor: '#141414', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1f1f1f' },
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.9)', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  subscribeBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' }, subscribeBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
});
