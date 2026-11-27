import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

const FEATURES = [
  { icon: 'chatbubbles', title: 'Exclusive Stickers', desc: 'Send custom reactions and stickers' },
  { icon: 'color-palette', title: 'Custom App Icons', desc: 'Change your icon to stand out' },
  { icon: 'notifications', title: 'Exclusive Ringtones', desc: 'Set custom call sounds for your close friends' },
  { icon: 'pin', title: 'Pin Extra Chats', desc: 'Pin up to 10 conversations to the top' },
  { icon: 'happy', title: 'Default Reactions', desc: 'Choose your default emoji for double-taps' },
  { icon: 'time', title: 'Focus Schedules', desc: 'Mute or hide chats on a custom schedule' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function SubscriptionScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, reloadProfile } = useAuth();
  
  const [step, setStep] = useState<'plans' | 'wizard' | 'payment' | 'polling' | 'success' | 'failed'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'core' | 'premium'>('core');
  const [wizardIndex, setWizardIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pollingRef = useRef<any>(null);
  
  const [coreData, setCoreData] = useState<any>(null);
  const [premiumData, setPremiumData] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);

  const savedPhone = profile?.mpesa_number || profile?.airtel_number || '';
  const premiumUntil = profile?.premium_until;
  const isPremium = premiumUntil && new Date(premiumUntil).getTime() > Date.now();
  const countdown = useCountdown(isPremium ? premiumUntil : '');

  useEffect(() => {
    const fetchPrices = async () => {
      const { data } = await supabase.from('app_pricing').select('*');
      if (data) {
        setCoreData(data.find(d => d.plan_key === 'core'));
        setPremiumData(data.find(d => d.plan_key === 'premium'));
      }
      setLoadingPrices(false);
    };
    fetchPrices();

    const channel = supabase.channel('pricing_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_pricing' }, () => fetchPrices())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (step === 'polling' && isPremium) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setStep('success');
      Toast.show({ type: 'success', text1: 'Subscription Active!', text2: 'Welcome to LU Pro.' });
    }
  }, [isPremium, step]);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const handleSubscribe = async () => {
    if (!savedPhone) {
      Toast.show({ type: 'error', text1: 'No phone linked', text2: 'Please link a payment number first.' });
      return navigation.navigate('PaymentMethodsScreen');
    }

    setSubmitting(true);
    const planData = selectedPlan === 'core' ? coreData : premiumData;
    const planPrice = planData?.base_price || 0;
    const durationDays = planData?.duration_days || 30;

    try {
      let cleanedPhone = savedPhone.replace(/\D/g, '');
      if (cleanedPhone.startsWith('0')) cleanedPhone = '254' + cleanedPhone.slice(1);

      const metadata = { plan: selectedPlan, category: 'subscription', duration_days: durationDays };

      const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
        body: { phone: cleanedPhone, amount: planPrice, purpose: 'lu_pro', user_id: profile!.id, metadata }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep('polling');
      let attempts = 0;
      
      pollingRef.current = setInterval(async () => {
        attempts++;
        const { data: freshProfile } = await supabase.from('profiles').select('premium_until').eq('id', profile!.id).single();
        if (freshProfile?.premium_until && new Date(freshProfile.premium_until).getTime() > Date.now()) {
          clearInterval(pollingRef.current);
          reloadProfile();
          setStep('success');
        } else if (attempts >= 20) {
          clearInterval(pollingRef.current);
          setStep('failed');
        }
      }, 3000);

    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Payment Failed', text2: e.message });
      setStep('payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'plans') navigation.goBack();
    else if (step === 'wizard' && wizardIndex > 0) setWizardIndex(wizardIndex - 1);
    else if (step === 'wizard') { setStep('plans'); setWizardIndex(0); }
    else setStep('plans');
  };

  if (loadingPrices) {
    return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#FFD700" /></View>;
  }

  // ACTIVE STATE (Already Subscribed)
  if (isPremium && step !== 'success') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <LinearGradient colors={['rgba(255,215,0,0.15)', '#000000', '#000000']} style={StyleSheet.absoluteFillObject} />
        <TopBar title="LU Pro" showBack={true} onBack={() => navigation.goBack()} />

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <Image source={require('../../assets/images/infinit_logo.png')} style={{ width: 120, height: 120, resizeMode: 'contain' }} />
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 10 }}>You are on LU Pro</Text>
            <Text style={{ color: '#a1a1aa', fontSize: 14, marginTop: 6 }}>Premium features are active</Text>
          </View>

          <View style={styles.countdownCard}>
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 }}>TIME REMAINING</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <CountdownBox label="DAYS" value={countdown.days} />
              <CountdownBox label="HRS" value={countdown.hours} />
              <CountdownBox label="MIN" value={countdown.minutes} />
              <CountdownBox label="SEC" value={countdown.seconds} />
            </View>
            <Text style={{ color: '#6d7382', fontSize: 13, textAlign: 'center' }}>Renews on {formatDate(premiumUntil)}</Text>
          </View>

          <Text style={styles.sectionHeader}>YOUR ACTIVE BENEFITS</Text>
          <View style={{ paddingLeft: 10 }}>
            {FEATURES.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row' }}>
                <View style={{ alignItems: 'center', marginRight: 16 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                  {i !== FEATURES.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: '#22c55e', marginVertical: 4 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 24 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{f.title}</Text>
                  <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 4 }}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // WIZARD
  if (step === 'wizard') {
    const currentFeature = FEATURES[wizardIndex];
    const isLastFeature = wizardIndex === FEATURES.length - 1;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TopBar title="What you get" showBack onBack={handleBack} />
        <View style={{ height: 4, backgroundColor: '#1f1f1f', marginHorizontal: 24, borderRadius: 2, marginTop: 10 }}>
          <View style={{ height: 4, backgroundColor: '#FFD700', borderRadius: 2, width: `${((wizardIndex + 1) / FEATURES.length) * 100}%` }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: '#FFD700', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name={currentFeature.icon as any} size={50} color="#FFD700" />
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>{currentFeature.title}</Text>
            <Text style={{ color: '#a1a1aa', fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>{currentFeature.desc}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <FastButton 
            onPress={() => isLastFeature ? setStep('payment') : setWizardIndex(wizardIndex + 1)}
            style={{ backgroundColor: '#FFD700', padding: 18, borderRadius: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>{isLastFeature ? `Continue to Payment` : 'Continue'}</Text>
          </FastButton>
        </ScrollView>
      </View>
    );
  }

  // PAYMENT / POLLING / SUCCESS / FAILED
  if (step === 'success' || step === 'polling' || step === 'failed') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        {step === 'success' && (
          <>
            <Image source={require('../../assets/images/infinit_logo.png')} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 }} />
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 10 }}>Welcome to LU Pro!</Text>
            <Text style={{ color: '#a1a1aa', fontSize: 15, textAlign: 'center', marginBottom: 30 }}>Your payment was successful. All premium features are now unlocked.</Text>
            <FastButton onPress={() => setStep('plans')} style={{ backgroundColor: '#FFD700', padding: 18, borderRadius: 16, width: '100%', alignItems: 'center' }}>
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>See my benefits</Text>
            </FastButton>
          </>
        )}
        {step === 'polling' && (
          <>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 24, textAlign: 'center' }}>Waiting for M-Pesa PIN...</Text>
          </>
        )}
        {step === 'failed' && (
          <>
            <Ionicons name="close-circle" size={80} color="#ef4444" />
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 20 }}>Payment Failed</Text>
            <FastButton onPress={() => setStep('payment')} style={{ backgroundColor: '#1f1f1f', padding: 18, borderRadius: 16, width: '100%', alignItems: 'center', marginTop: 30 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Try Again</Text>
            </FastButton>
          </>
        )}
      </View>
    );
  }

  if (step === 'payment') {
    const planData = selectedPlan === 'core' ? coreData : premiumData;
    const price = planData?.base_price || 0;
    const days = planData?.duration_days || 30;
    
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TopBar title="Confirm Payment" showBack onBack={handleBack} />
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
             <Image source={require('../../assets/images/infinit_logo.png')} style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 10 }} />
             <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }}>PAYMENT FOR LU PRO {selectedPlan.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.sectionHeader}>PAYMENT SUMMARY</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>M-Pesa Number</Text><Text style={styles.summaryValue}>{savedPhone || 'Not Linked'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Plan</Text><Text style={styles.summaryValue}>{selectedPlan}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Duration</Text><Text style={styles.summaryValue}>{days} days</Text></View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}><Text style={styles.summaryLabel}>Total</Text><Text style={[styles.summaryValue, { color: '#FFD700', fontWeight: '900', fontSize: 22 }]}>KES {price}</Text></View>
          </View>
          <FastButton onPress={handleSubscribe} disabled={submitting || !savedPhone} style={{ backgroundColor: savedPhone ? '#FFD700' : '#2a2a2a', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 }}>
            {submitting ? <ActivityIndicator color="#000" /> : <Text style={{ color: savedPhone ? '#000' : '#6d7382', fontSize: 16, fontWeight: '900' }}>Pay KES {price}</Text>}
          </FastButton>
        </ScrollView>
      </View>
    );
  }

  // PLANS
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <LinearGradient colors={['rgba(255,215,0,0.1)', '#000000', '#000000']} style={StyleSheet.absoluteFillObject} />
      <TopBar title="LU Pro" showBack={true} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Image source={require('../../assets/images/infinit_logo.png')} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 10 }} />
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>LU Pro</Text>
        </View>
        <Text style={styles.sectionHeader}>CHOOSE YOUR PLAN</Text>
        <TouchableOpacity style={[styles.planCard, selectedPlan === 'core' && styles.planCardActive]} onPress={() => setSelectedPlan('core')}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Core</Text>
            <Ionicons name={selectedPlan === 'core' ? "radio-button-on" : "radio-button-off"} size={24} color={selectedPlan === 'core' ? "#FFD700" : "#6d7382"} />
          </View>
          <Text style={styles.planPrice}>KES {coreData?.base_price || 0}/{coreData?.duration_days || 30} days</Text>
          <Text style={styles.planDesc}>{coreData?.description || 'Express yourself in new ways'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.planCard, selectedPlan === 'premium' && styles.planCardActive]} onPress={() => setSelectedPlan('premium')}>
          <View style={styles.bestValueBadge}><Text style={styles.bestValueText}>BEST VALUE</Text></View>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Premium</Text>
            <Ionicons name={selectedPlan === 'premium' ? "radio-button-on" : "radio-button-off"} size={24} color={selectedPlan === 'premium' ? "#FFD700" : "#6d7382"} />
          </View>
          <Text style={styles.planPrice}>KES {premiumData?.base_price || 0}/{premiumData?.duration_days || 30} days</Text>
          <Text style={styles.planDesc}>{premiumData?.description || 'Expand the possibilities with expanded AI usage'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity onPress={() => { setWizardIndex(0); setStep('wizard'); }}>
          <LinearGradient colors={['#FFDF00', '#D4AF37']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subscribeBtn}>
            <Text style={styles.subscribeBtnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CountdownBox({ label, value }: { label: string, value: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1f1f1f' }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>{value.toString().padStart(2, '0')}</Text>
      <Text style={{ color: '#6d7382', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, marginTop: 20 },
  planCard: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 24, marginBottom: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  planCardActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  planPrice: { color: '#FFD700', fontSize: 22, fontWeight: '900', marginBottom: 6 },
  planDesc: { color: '#a1a1aa', fontSize: 14, lineHeight: 20 },
  bestValueBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  bestValueText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  summaryBox: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1f1f1f' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  summaryLabel: { color: '#6d7382', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
  countdownCard: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FFD700', marginBottom: 30 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.95)', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  subscribeBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  subscribeBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
