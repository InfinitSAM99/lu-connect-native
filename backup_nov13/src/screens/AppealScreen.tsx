import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import Svg, { Rect, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import BottomSheet from '../components/BottomSheet';

const TERMS = [
  { title: 'Respect every member', body: 'No harassment, bullying, or abusive behaviour toward anyone on LU CONNECT.' },
  { title: 'No hate speech or threats', body: 'Content that attacks or threatens people will not be tolerated.' },
  { title: 'No illegal activity', body: 'No scams, drugs, piracy, or anything prohibited by law or university policy.' },
  { title: 'No spam or impersonation', body: 'Do not spam, use fake accounts, or pretend to be someone else.' },
  { title: 'Follow LU guidelines', body: 'All LU CONNECT community rules apply at all times.' },
];

export default function AppealScreen({ navigation }: any) {
  const { profile, user, reloadProfile, signOut } = useAuth();

  const [appeal, setAppeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState<string | null>(null);
  
  const [selfies, setSelfies] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [appealText, setAppealText] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  
  const [consentChecked, setConsentChecked] = useState(false);
  const [acceptingConsent, setAcceptingConsent] = useState(false);

  const loadAppeal = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase.from('ban_appeals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setAppeal(data || null);
    if (data?.appeal_text) setAppealText(data.appeal_text);
    setLoading(false);
    // Reload profile to check if admin approved/updated status
    await reloadProfile?.();
  };

  useEffect(() => { loadAppeal(); }, [user?.id]);

  // Realtime: listen for admin updates to this user's ban_appeal and profile
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`appeal-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ban_appeals', filter: `user_id=eq.${user.id}` }, () => {
        loadAppeal();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, async (payload: any) => {
        console.log('PROFILE UPDATED:', payload.new?.approval_status);
        
        // Only reload the profile AFTER the user accepts terms
        // (don't trigger it here, or it will skip the consent step)
        if (payload.new?.approval_status === 'approved' && appeal?.consent_accepted_at) {
          await reloadProfile?.();
        }
      });
    const timer = setTimeout(() => ch.subscribe(), 100);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [user?.id]);

  // Pre-request camera permissions when screen opens to make it faster
  useEffect(() => {
    (async () => {
      try { await ImagePicker.requestCameraPermissionsAsync(); } catch {}
    })();
  }, []);

  // Pre-request camera permissions when screen opens to make it faster
  useEffect(() => {
    (async () => {
      try { await ImagePicker.requestCameraPermissionsAsync(); } catch {}
    })();
  }, []);
  useEffect(() => {
    if (!appeal || loading) return;
    // Only auto-open if no sheet is already open
    if (sheet) return;
    
    if (appeal.stage === 'identity_rejected') setSheet('identity');
    else if (appeal.stage === 'appeal_open') setSheet('writeAppeal');
    else if (appeal.stage === 'unbanned') setSheet('consent');
  }, [appeal?.stage, loading]);

  const pickSelfie = async () => {
    if (selfies.length >= 2) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({ 
        mediaTypes: ['images'],
        quality: 0.5, // Compress to save memory and upload faster
        allowsEditing: true, // Let them crop so it's small
        aspect: [1, 1],
      });

      if (!result.canceled) {
        setSelfies((s) => [...s, { file: result.assets[0], preview: result.assets[0].uri }]);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      Alert.alert('Camera Error', 'Could not open the camera. Please try again.');
    }
  };

  const submitIdentity = async () => {
    if (selfies.length === 0) return setErr('Please capture at least one selfie');
    setUploading(true); setErr('');
    
    try {
      const urls: string[] = [];
      for (let i = 0; i < selfies.length; i++) {
        const file = selfies[i].file;
        const ext = file.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/selfie-${Date.now()}-${i}.${ext}`;
        
        console.log('Reading file:', file.uri);

        // Read the file as Base64
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Decode Base64 to ArrayBuffer
        const arrayBuffer = decode(base64);

        // Upload with explicit contentType
        const { error: upErr } = await supabase.storage
          .from('appeals')
          .upload(path, arrayBuffer, { 
            contentType: 'image/jpeg', // Force image/jpeg
            upsert: true 
          });
          
        if (upErr) throw new Error(upErr.message);
        urls.push(path);
        console.log('Uploaded:', path);
      }

      console.log('Saving to database...');
      if (appeal) {
        const { error } = await supabase.from('ban_appeals').update({ 
          stage: 'identity_pending', 
          identity_photos: urls, 
          submitted_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        }).eq('id', appeal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ban_appeals').insert({ 
          user_id: user.id, 
          stage: 'identity_pending', 
          identity_photos: urls, 
          submitted_at: new Date().toISOString() 
        });
        if (error) throw error;
      }

      setSelfies([]); 
      setSubmitted(true); 
      await loadAppeal();
      setTimeout(() => { setSubmitted(false); setSheet(null); }, 1800);
      
    } catch (e: any) {
      console.error('Submit error:', e);
      setErr(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const submitAppeal = async () => {
    if (!appealText.trim() || appealText.trim().length < 20) return setErr('Please write at least a few sentences');
    setSubmittingAppeal(true); setErr('');
    const { error } = await supabase.from('ban_appeals').update({ stage: 'appeal_submitted', appeal_text: appealText.trim(), submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', appeal.id);
    setSubmittingAppeal(false);
    if (error) return setErr(error.message);
    setSheet(null); await loadAppeal();
  };

  const acceptConsent = async () => {
    if (!consentChecked) return;
    setAcceptingConsent(true); setErr('');

    // Save consent on the appeal record
    const { error: apErr } = await supabase
      .from('ban_appeals')
      .update({ 
        consent_accepted_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', appeal.id);

    setAcceptingConsent(false);
    if (apErr) return setErr(apErr.message);

    // Reload profile — admin already set approval_status = 'approved'
    await reloadProfile?.();
  };

  const doLogout = async () => {
    await signOut();
    // AppNavigator will show Login automatically when user becomes null
  };


  if (loading) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;

  const stage = appeal?.stage || 'new';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Svg viewBox="0 0 200 200" width={96} height={96}>
          <Rect x="14" y="14" width="172" height="172" rx="34" fill="none" stroke="#ef4444" strokeWidth={5} />
          <Path d="M 62 60 L 62 130 L 96 130" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={styles.heroSub}>ACCOUNT RESTRICTED</Text>
        <Text style={styles.heroTitle}>Appeal your ban</Text>
      </View>

      {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}

      <View style={{ flex: 1 }}>
        {stage === 'new' && <StageBox icon="camera" title="Verify your identity" body="To review your appeal, we need to confirm you are the person on this account. Take up to 2 selfies." cta="Take selfies" onCta={() => setSheet('identity')} />}
        {stage === 'identity_pending' && <StageBox icon="time" title="Under review" body="We received your identity check. This can take up to 2 days." />}
        {stage === 'identity_rejected' && <StageBox icon="close-circle" title="Verification failed" body={appeal?.admin_note || 'Your selfies did not match your profile photo.'} cta="Try again" onCta={() => setSheet('identity')} brand />}
        {stage === 'appeal_open' && <StageBox icon="shield-checkmark" title="Write your appeal" body="Identity verified. Now tell us why your account should be restored." cta="Write appeal" onCta={() => setSheet('writeAppeal')} />}
        {stage === 'appeal_submitted' && <StageBox icon="time" title="Appeal under review" body="Your appeal has been submitted. We will review it and get back to you." />}
        {stage === 'unbanned' && <StageBox icon="checkmark-circle" title="Appeal approved" body="Your appeal was accepted. Review and accept our updated terms to restore." cta="Review terms" onCta={() => setSheet('consent')} />}
        {stage === 'rejected_appeal' && <StageBox icon="alert-circle" title="Appeal declined" body={profile?.rejection_reason || appeal?.admin_note || 'Your account has been suspended. You can appeal this decision below.'} />}
        {stage === 'high_ban' && <StageBox icon="ban" title="Permanently removed" body="This account has been permanently removed from LU CONNECT." />}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={doLogout}>
        <Ionicons name="log-out-outline" size={18} color="#6d7382" />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      {/* IDENTITY SHEET */}
      <BottomSheet open={sheet === 'identity'} onClose={() => setSheet(null)} maxHeight="90vh">
        {submitted ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
            <Text style={styles.successTitle}>Submitted successfully</Text>
            <Text style={styles.successBody}>We'll review your identity within 2 days.</Text>
          </View>
        ) : (
          <View style={{ padding: 20 }}>
            <Text style={styles.sheetTitle}>Verify your identity</Text>
            <Text style={styles.sheetSubtitle}>Take 1 or 2 selfies. Make sure your face is clearly visible.</Text>
            
            <View style={styles.selfieGrid}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.selfieBox}>
                  {selfies[i] ? (
                    <>
                      <Image source={{ uri: selfies[i].preview }} style={styles.selfieImg} />
                      <TouchableOpacity style={styles.removeBtn} onPress={() => setSelfies((s) => s.filter((_, idx) => idx !== i))}>
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.addSelfieBtn} onPress={pickSelfie}>
                      <Ionicons name="camera" size={28} color="#6d7382" />
                      <Text style={{ fontSize: 12, color: '#6d7382' }}>Tap to capture</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, selfies.length === 0 && styles.disabledBtn]} onPress={submitIdentity} disabled={uploading || selfies.length === 0}>
              <Text style={styles.primaryBtnText}>{uploading ? 'Uploading…' : 'Submit for review'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* APPEAL SHEET */}
      <BottomSheet open={sheet === 'writeAppeal'} onClose={() => setSheet(null)} maxHeight="90vh">
        <View style={{ padding: 20 }}>
          <Text style={styles.sheetTitle}>Write your appeal</Text>
          <Text style={styles.sheetSubtitle}>Explain what happened and why your account should be restored.</Text>
          <TextInput 
            style={styles.textarea} multiline maxLength={2000}
            value={appealText} onChangeText={setAppealText}
            placeholder="I believe my account should be restored because…" placeholderTextColor="#6d7382"
          />
          <Text style={{ fontSize: 11, color: '#6d7382', textAlign: 'right', marginBottom: 20 }}>{appealText.length} / 2000</Text>
          <TouchableOpacity style={[styles.primaryBtn, appealText.trim().length < 20 && styles.disabledBtn]} onPress={submitAppeal} disabled={submittingAppeal || appealText.trim().length < 20}>
            <Text style={styles.primaryBtnText}>{submittingAppeal ? 'Submitting…' : 'Submit appeal'}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* CONSENT SHEET */}
      <BottomSheet open={sheet === 'consent'} onClose={() => setSheet(null)} maxHeight="92vh">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.sheetTitle}>Accept our terms</Text>
          <Text style={styles.sheetSubtitle}>Before we restore your account, please read and accept our community rules.</Text>
          
          <View style={{ marginBottom: 20 }}>
            {TERMS.map((t, i) => (
              <View key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: i === TERMS.length - 1 ? 0 : 1, borderBottomColor: '#1f1f1f' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 }}>{i + 1}. {t.title}</Text>
                <Text style={{ fontSize: 13, color: '#6d7382', lineHeight: 20 }}>{t.body}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.checkRow} onPress={() => setConsentChecked(!consentChecked)}>
            <View style={[styles.checkbox, consentChecked && styles.checkboxActive]}>
              {consentChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={{ fontSize: 13, color: '#fff', flex: 1 }}>I have read and accept the LU CONNECT community rules.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryBtn, !consentChecked && styles.disabledBtn]} onPress={acceptConsent} disabled={!consentChecked || acceptingConsent}>
            <Text style={styles.primaryBtnText}>{acceptingConsent ? 'Restoring access…' : 'I accept — restore my account'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </ScrollView>
  );
}

function StageBox({ icon, title, body, cta, onCta, brand }: any) {
  return (
    <View style={{ alignItems: 'center', padding: 24 }}>
      <View style={styles.iconCircle}><Ionicons name={icon} size={44} color="#fff" /></View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 }}>{title}</Text>
      <Text style={{ fontSize: 14, color: '#6d7382', textAlign: 'center', lineHeight: 22, marginBottom: cta ? 20 : 0 }}>{body}</Text>
      {cta && (
        <TouchableOpacity style={[styles.primaryBtn, !brand && { backgroundColor: '#141414' }]} onPress={onCta}>
          <Text style={styles.primaryBtnText}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000', padding: 24, paddingTop: 40 },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 32 },
  heroSub: { fontSize: 11, color: '#ef4444', letterSpacing: 1.4, fontWeight: '700', marginTop: 14 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 8 },
  errBox: { backgroundColor: 'rgba(239,68,68,0.14)', padding: 12, borderRadius: 12, marginBottom: 16 },
  errText: { color: '#ef4444', fontSize: 13 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 14, marginTop: 24 },
  logoutText: { color: '#6d7382', fontWeight: '600', fontSize: 14 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%' },
  disabledBtn: { backgroundColor: '#141414', opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', marginBottom: 24 },
  selfieGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  selfieBox: { flex: 1, aspectRatio: 1, borderRadius: 16, backgroundColor: '#141414', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  selfieImg: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  addSelfieBtn: { alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: '100%' },
  textarea: { backgroundColor: '#141414', borderRadius: 16, padding: 16, color: '#fff', fontSize: 15, lineHeight: 22, minHeight: 180, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#ef4444', borderWidth: 0 },
  successBox: { alignItems: 'center', padding: 40 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 20, marginBottom: 8 },
  successBody: { fontSize: 13, color: '#6d7382', textAlign: 'center' },
});
