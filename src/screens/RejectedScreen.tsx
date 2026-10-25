import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function RejectedScreen({ navigation }: any) {
  const { profile, signOut, reloadProfile } = useAuth();
  const [mobile, setMobile] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState(profile?.admission_number || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setLoading(true);
    const { error } = await supabase.from('profiles').update({
      mobile_number: mobile,
      admission_number: admissionNumber,
      approval_status: 'pending',
      resubmit_count: (profile?.resubmit_count || 0) + 1,
    }).eq('id', profile.id);

    setLoading(false);
    if (error) return setErr(error.message);
    await reloadProfile();
    navigation.replace('Pending');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Account Not Approved</Text>
        <Text style={styles.body}>
          Your account could not be verified. Please contact the admin or resubmit with a valid mobile number so we can reach you.
        </Text>

        {profile?.rejection_reason && (
          <View style={styles.errInfoBox}>
            <Text style={styles.errInfoText}><Text style={{ fontWeight: 'bold' }}>Reason: </Text>{profile.rejection_reason}</Text>
          </View>
        )}

        {err ? <View style={styles.errInfoBox}><Text style={styles.errInfoText}>{err}</Text></View> : null}

        <Text style={styles.label}>Admission / Registration number</Text>
        <TextInput style={styles.input} value={admissionNumber} onChangeText={setAdmissionNumber} placeholderTextColor="#6d7382" />

        <Text style={styles.label}>Mobile number (so admin can contact you)</Text>
        <TextInput style={styles.input} keyboardType="phone-pad" placeholder="+254 7XX XXX XXX" placeholderTextColor="#6d7382" value={mobile} onChangeText={setMobile} />

        <Text style={styles.label}>Message to admin (optional)</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={message} onChangeText={setMessage} placeholder="Explain your situation…" placeholderTextColor="#6d7382" />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Submitting…' : 'Resubmit for review'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ghostBtn} onPress={signOut}>
          <Text style={styles.ghostBtnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 16, padding: 28 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#ef4444', textAlign: 'center', marginBottom: 12 },
  body: { color: '#aab0bd', fontSize: 14, lineHeight: 22, marginBottom: 16, textAlign: 'center' },
  errInfoBox: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, marginBottom: 16 },
  errInfoText: { color: '#ef4444', fontSize: 13 },
  label: { fontSize: 13, color: '#aab0bd', marginBottom: 6 },
  input: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 12 },
  btn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  ghostBtn: { padding: 14, alignItems: 'center', marginTop: 10 },
  ghostBtnText: { color: '#aab0bd', fontWeight: '600' },
});
