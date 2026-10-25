import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

const PRICE = 300;
const MPESA_NUMBER = '0725303245';
const MPESA_NAME = 'Samuel Mugasia';

function SectionHeader({ children }: any) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

function PaymentRow({ iconName, label, value }: any) {
  return (
    <View style={styles.paymentRow}>
      <Ionicons name={iconName} size={20} color="#6d7382" style={{ width: 24 }} />
      <Text style={{ fontSize: 14, color: '#6d7382' }}>{label}: <Text style={{ color: '#fff', fontWeight: '500' }}>{value}</Text></Text>
    </View>
  );
}

function StatusPill({ status }: any) {
  const s = status === 'approved' ? { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' } 
          : status === 'rejected' ? { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' } 
          : { bg: '#141414', color: '#aab0bd' };
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{status}</Text>
    </View>
  );
}

export default function GetVerifiedScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myPayments, setMyPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

  const load = async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase.from('payments').select('id, amount, mpesa_code, status, rejection_reason, created_at').eq('user_id', profile.id).eq('purpose', 'verify').order('created_at', { ascending: false }).limit(5);
    if (error) setErrMsg(error.message);
    setMyPayments(data || []);
    setLoading(false);
  };

  useEffect(() => { if (profile) load(); }, [profile?.id]);

  const submit = async () => {
    setErrMsg('');
    const cleanedCode = code.trim().toUpperCase();
    if (cleanedCode.length < 6) return setErrMsg('Enter the full M-Pesa confirmation code (e.g. QK47ABC123).');
    
    setSubmitting(true);
    const { error } = await supabase.from('payments').insert({
      user_id: profile.id,
      amount: PRICE,
      purpose: 'verify',
      mpesa_code: cleanedCode,
      phone: phone.trim(),
    });
    setSubmitting(false);
    if (error) return setErrMsg('Submit failed: ' + error.message);
    setCode(''); setPhone(''); load();
  };

  const isVerified = profile?.is_verified;
  const pending = myPayments.find(p => p.status === 'pending');
  const rejected = myPayments.find(p => p.status === 'rejected');

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar 
        hero 
        title="Get verified" 
        subtitle="Join the trusted members of LU CONNECT"
        showBack={true} 
        onBack={() => navigation.goBack()} 
        rightComponent={<Ionicons name="shield-checkmark" size={48} color="#ef4444" style={{ marginTop: 4 }} />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        
        <View style={styles.headerRow}>
          <Ionicons name="shield-checkmark" size={40} color="#ef4444" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 20, color: '#fff' }}>Verified Badge</Text>
            <Text style={{ fontSize: 14, color: '#6d7382', marginTop: 6, lineHeight: 20 }}>Get a blue checkmark on your profile, posts, comments and messages.</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#ef4444' }}>KSh {PRICE}</Text>
          <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>One-time payment</Text>
        </View>

        {isVerified && (
          <View style={[styles.infoBox, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <Ionicons name="checkmark-circle" size={22} color="#ef4444" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#ef4444', fontSize: 15 }}>You are already verified</Text>
              <Text style={{ fontSize: 13, color: '#aab0bd', marginTop: 4 }}>Your account shows the verified badge everywhere.</Text>
            </View>
          </View>
        )}

        {!isVerified && pending && (
          <View style={styles.infoBox}>
            <Ionicons name="hourglass" size={22} color="#6d7382" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: '#fff' }}>Pending review</Text>
              <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 4 }}>We received your code <Text style={{ color: '#fff', fontWeight: 'bold' }}>{pending.mpesa_code}</Text>.</Text>
            </View>
          </View>
        )}

        {!isVerified && rejected && !pending && (
          <View style={styles.infoBox}>
            <Ionicons name="close-circle" size={22} color="#ef4444" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#ef4444', fontSize: 15 }}>Rejected</Text>
              <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 4 }}>{rejected.rejection_reason || 'Payment could not be verified.'}</Text>
            </View>
          </View>
        )}

        {!isVerified && !pending && (
          <>
            <SectionHeader>Step 1 · Send payment</SectionHeader>
            <View style={{ paddingHorizontal: 20 }}>
              <PaymentRow iconName="chatbubble-outline" label="M-Pesa number" value={MPESA_NUMBER} />
              <PaymentRow iconName="person-outline" label="Name" value={MPESA_NAME} />
              <PaymentRow iconName="star-outline" label="Amount" value={`KSh ${PRICE}`} />
              <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 14, lineHeight: 20 }}>Send the money via M-Pesa, then copy the confirmation code.</Text>
            </View>

            <SectionHeader>Step 2 · Submit confirmation</SectionHeader>
            <View style={{ paddingHorizontal: 20 }}>
              {errMsg ? <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{errMsg}</Text> : null}
              
              <Text style={styles.label}>M-Pesa code</Text>
              <TextInput style={styles.input} placeholder="e.g. QK47ABC123" placeholderTextColor="#6d7382" value={code} onChangeText={setCode} autoCapitalize="characters" />
              
              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput style={styles.input} placeholder="07XX XXX XXX" placeholderTextColor="#6d7382" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              
              <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={submitting}>
                <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit for review'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {myPayments.length > 0 && (
          <>
            <SectionHeader>Payment history</SectionHeader>
            <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              {myPayments.map(p => (
                <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 14, color: '#fff' }}>{p.mpesa_code}</Text>
                    <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 2 }}>{new Date(p.created_at).toLocaleString()}</Text>
                  </View>
                  <StatusPill status={p.status} />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  infoBox: { flexDirection: 'row', backgroundColor: '#141414', padding: 16, borderRadius: 12, marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, fontSize: 13, fontWeight: '500', color: '#6d7382' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 13, color: '#6d7382', marginBottom: 6 },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
