import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';

const { width: SCREEN_W } = Dimensions.get('window');

// The 6 Onboarding Steps
const ONBOARDING_STEPS = [
  { 
    icon: 'bar-chart', 
    title: 'Real-time engagement graphs', 
    desc: 'See exactly how your posts are performing. Track likes, comments, and reach as they happen, and understand what content resonates most with your audience.' 
  },
  { 
    icon: 'people', 
    title: 'Follower insights', 
    desc: 'Understand who is engaging with you. See which faculties and years your followers are from, helping you tailor your content to your specific community.' 
  },
  { 
    icon: 'shield-checkmark', 
    title: 'Priority verification review', 
    desc: 'Professional accounts are fast-tracked in our verification queue. Get your blue checkmark sooner and build trust with your audience.' 
  },
  { 
    icon: 'rocket', 
    title: 'Boost eligibility', 
    desc: 'Need to sell something on the Marketplace or promote an event? Professional mode unlocks the ability to boost your posts so more students see them.' 
  },
  { 
    icon: 'wallet', 
    title: 'Monetization & Payouts', 
    desc: 'Earn money from your content! Get paid for growing your audience and receiving high engagement. Link your M-Pesa number directly in the app.' 
  },
  { 
    icon: 'checkmark-done-circle', 
    title: 'Ready to elevate your profile?', 
    desc: 'By enabling Professional Mode, you agree to our Creator Terms. You can turn this off at any time without losing your followers or data.' 
  }
];

const CREATOR_TOOLS = [
  { id: 'ProfessionalDashboard', icon: 'bar-chart', title: 'Insights Dashboard', subtitle: 'View analytics & growth', color: '#a855f7' },
  { id: 'Payouts', icon: 'wallet', title: 'Payouts (M-Pesa)', subtitle: 'Manage your earnings', color: '#22c55e' },
  { id: 'GetVerified', icon: 'shield-checkmark', title: 'Get Verified', subtitle: 'Apply for priority review', color: '#06b6d4' },
  { id: 'GetBoosted', icon: 'flame', title: 'Get Boosted', subtitle: 'Promote your profile', color: '#ec4899' },
];

export default function ProfessionalModeScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [step, setStep] = useState(0);
  
  const [disableOpen, setDisableOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  if (!profile) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;

  const isPro = !!profile.professional_mode;

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      acceptTerms();
    }
  };

  const acceptTerms = async () => {
    setBusy(true); setErrMsg('');
    const { error } = await supabase.from('profiles').update({ 
      professional_mode: true, 
      professional_agreed_at: new Date().toISOString() 
    }).eq('id', profile.id);
    
    setBusy(false);
    if (error) return setErrMsg(error.message);
    
    setOnboardingOpen(false);
    setStep(0);
    await reloadProfile?.();
  };

  const confirmDisable = async () => {
    setBusy(true); setErrMsg('');
    const { error } = await supabase.from('profiles').update({ professional_mode: false }).eq('id', profile.id);
    setBusy(false);
    setDisableOpen(false);
    if (error) return setErrMsg(error.message);
    await reloadProfile?.();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        hero
        title="Professional Mode"
        subtitle={isPro ? 'Creator tools are active on your account.' : 'Unlock followers, analytics & creator tools.'}
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={<Ionicons name="rocket" size={44} color="#ef4444" style={{ marginTop: 4 }} />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
        
        {/* IF OFF: SHOW BENEFITS PREVIEW */}
        {!isPro && (
          <>
            <Text style={styles.sectionHeader}>WHAT YOU GET</Text>
            {ONBOARDING_STEPS.slice(0, 4).map((b, i) => (
              <TouchableOpacity key={i} style={styles.flatRow} onPress={() => { setStep(i); setOnboardingOpen(true); }} activeOpacity={0.7}>
                <View style={styles.iconWrap}><Ionicons name={b.icon as any} size={24} color="#ef4444" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitSub} numberOfLines={1}>{b.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* IF ON: SHOW CREATOR TOOLS */}
        {isPro && (
          <>
            <Text style={styles.sectionHeader}>CREATOR TOOLS</Text>
            {CREATOR_TOOLS.map((tool) => (
              <TouchableOpacity 
                key={tool.id} 
                style={styles.flatRow} 
                onPress={() => {
                  if (tool.id === 'Payouts') navigation.navigate('ProfessionalDashboard');
                  else navigation.navigate(tool.id);
                }} 
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${tool.color}15` }]}>
                  <Ionicons name={tool.icon as any} size={24} color={tool.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{tool.title}</Text>
                  <Text style={styles.benefitSub}>{tool.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6d7382" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {errMsg ? <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginTop: 16 }}>{errMsg}</Text> : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16 }}>
          {!isPro ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setStep(0); setOnboardingOpen(true); }}>
              <Ionicons name="rocket" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Enable Professional Mode</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDisableOpen(true)} disabled={busy}>
              <Text style={styles.outlineBtnText}>{busy ? 'Turning off…' : 'Turn off Professional Mode'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={{ paddingHorizontal: 30, fontSize: 12, color: '#6d7382', textAlign: 'center', lineHeight: 18, marginTop: 10 }}>
          {isPro ? 'Turning off does not delete your followers, connections, or any data.' : 'You will be guided through the features before enabling.'}
        </Text>
      </ScrollView>

      {/* FULL SCREEN ONBOARDING MODAL */}
      <Modal visible={onboardingOpen} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
          
          {/* HEADER */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setOnboardingOpen(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#6d7382', fontWeight: '800', letterSpacing: 1 }}>PRO MODE</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* PROGRESS DOTS */}
          <View style={styles.progressContainer}>
            {ONBOARDING_STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotCompleted]} />
            ))}
          </View>

          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
            
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Ionicons name={ONBOARDING_STEPS[step].icon as any} size={40} color="#ef4444" />
              </View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16 }}>
                {ONBOARDING_STEPS[step].title}
              </Text>
              <Text style={{ color: '#aab0bd', fontSize: 16, lineHeight: 26, textAlign: 'center' }}>
                {ONBOARDING_STEPS[step].desc}
              </Text>
            </View>

          </ScrollView>

          {/* BOTTOM BUTTON */}
          <View style={{ padding: 24, paddingBottom: insets.bottom + 24 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} disabled={busy}>
              <Text style={styles.primaryBtnText}>
                {busy ? 'Enabling...' : (step === ONBOARDING_STEPS.length - 1 ? 'Agree & Enable' : 'Next')}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </Modal>

      {/* DISABLE CONFIRMATION SHEET */}
      <BottomSheet open={disableOpen} onClose={() => setDisableOpen(false)} maxHeight="40vh">
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 }}>Turn off Professional Mode?</Text>
          <Text style={{ fontSize: 14, color: '#6d7382', textAlign: 'center', marginBottom: 24 }}>Your followers and connections stay.</Text>
          <TouchableOpacity style={[styles.outlineBtn, { width: '100%', borderColor: '#ef4444', marginBottom: 12 }]} onPress={confirmDisable} disabled={busy}>
            <Text style={[styles.outlineBtnText, { color: '#ef4444' }]}>{busy ? 'Turning off…' : 'Turn off'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { width: '100%', backgroundColor: '#141414' }]} onPress={() => setDisableOpen(false)}>
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, fontSize: 12, fontWeight: '800', color: '#6d7382', letterSpacing: 1 },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 24 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontWeight: '700', fontSize: 16, color: '#fff', marginBottom: 4 },
  benefitSub: { fontSize: 13, color: '#6d7382' },
  
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 12, padding: 18 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: { alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 12, padding: 16 },
  outlineBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },

  // Onboarding Modal Styles
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1f1f1f' },
  dotActive: { backgroundColor: '#ef4444', width: 24, borderRadius: 4 },
  dotCompleted: { backgroundColor: '#6d7382' },
});
