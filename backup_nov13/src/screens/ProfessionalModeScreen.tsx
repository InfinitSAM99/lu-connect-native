import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';

const BENEFITS = [
  { key: 'graphs', icon: 'stats-chart', title: 'Real-time engagement graphs', subtitle: 'See how your posts perform over time', detail: `Real-time graphs show you exactly how your content is landing with your audience.` },
  { key: 'followers', icon: 'people', title: 'Follower insights', subtitle: 'Understand who is engaging with you', detail: `Follower insights help you understand your audience at a glance.` },
  { key: 'verify', icon: 'shield-checkmark', title: 'Priority verification review', subtitle: 'Get verified faster', detail: `Professional accounts get priority in the verification queue.` },
  { key: 'boost', icon: 'rocket', title: 'Boost eligibility', subtitle: 'Reach more students with your posts', detail: `Boost lets you put a post or profile in front of more students than usual.` },
];

export default function ProfessionalModeScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [termsOpen, setTermsOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false); // NEW: Custom black confirm box
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [activeBenefit, setActiveBenefit] = useState<any>(null);

  if (!profile) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;

  const isPro = !!profile.professional_mode;

  const acceptTerms = async () => {
    setBusy(true); setErrMsg('');
    const { error } = await supabase.from('profiles').update({ professional_mode: true, professional_agreed_at: new Date().toISOString() }).eq('id', profile.id);
    setBusy(false);
    if (error) return setErrMsg(error.message);
    setTermsOpen(false);
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
        rightComponent={<Ionicons name="rocket" size={48} color="#ef4444" style={{ marginTop: 4 }} />} 
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        
        <Text style={styles.sectionHeader}>What you get</Text>
        
        {BENEFITS.map((b) => (
          <TouchableOpacity key={b.key} style={styles.flatRow} onPress={() => setActiveBenefit(b)}>
            <Ionicons name={b.icon as any} size={24} color="#ef4444" style={{ width: 32 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '500', fontSize: 15, color: '#fff' }}>{b.title}</Text>
              <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>{b.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6d7382" />
          </TouchableOpacity>
        ))}

        {errMsg ? <Text style={{ color: '#ef4444', fontSize: 13, paddingHorizontal: 20, marginTop: 8 }}>{errMsg}</Text> : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 16 }}>
          {!isPro ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setTermsOpen(true)}>
              <Ionicons name="rocket" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Enable Professional Mode</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDisableOpen(true)} disabled={busy}>
              <Text style={styles.outlineBtnText}>{busy ? 'Turning off…' : 'Turn off Professional Mode'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={{ paddingHorizontal: 20, fontSize: 12, color: '#6d7382', textAlign: 'center', lineHeight: 18 }}>
          {isPro ? 'Turning off does not delete your followers, connections, or any data.' : 'You will be asked to accept terms before enabling.'}
        </Text>
      </ScrollView>

      {/* BENEFIT DETAILS BOTTOM SHEET */}
      <BottomSheet open={!!activeBenefit} onClose={() => setActiveBenefit(null)} maxHeight="75vh">
        {activeBenefit && (
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Ionicons name={activeBenefit.icon} size={32} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 18, color: '#fff' }}>{activeBenefit.title}</Text>
                <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>{activeBenefit.subtitle}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: '#aab0bd', lineHeight: 24 }}>{activeBenefit.detail}</Text>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => setActiveBenefit(null)}>
              <Text style={styles.primaryBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* TERMS SHEET */}
      <BottomSheet open={termsOpen} onClose={() => setTermsOpen(false)} maxHeight="85vh">
        <View style={{ padding: 20 }}>
          <Ionicons name="shield-checkmark" size={48} color="#ef4444" style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 }}>Creator Terms</Text>
          <Text style={{ fontSize: 14, color: '#aab0bd', lineHeight: 22, marginBottom: 24 }}>By enabling Professional Mode, you agree to the LU CONNECT Creator Terms.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={acceptTerms} disabled={busy}>
            <Text style={styles.primaryBtnText}>{busy ? 'Enabling…' : 'I accept & Enable'}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* BLACK CONFIRMATION SHEET (Replaces Grey Alert) */}
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
  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, fontSize: 13, fontWeight: '500', color: '#6d7382' },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 10, padding: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  outlineBtn: { alignItems: 'center', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 14 },
  outlineBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
