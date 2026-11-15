import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ContactAdminScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [admission, setAdmission] = useState('');
  const [dob, setDob] = useState('');
  const [university, setUniversity] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!admission.trim() || !dob.trim() || !university.trim() || !message.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const { error } = await supabase.from('admin_messages').insert({
        user_id: user?.id,
        email: user?.email,
        admission_number: admission.trim(),
        dob: dob.trim(),
        university_name: university.trim(),
        message: message.trim(),
      });
      
      if (error) throw error;
      setSuccess(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = admission.trim() && dob.trim() && university.trim() && message.trim();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CONTACT ADMIN</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {success ? (
          <View style={styles.centerBox}>
             <View style={styles.logoBox}>
              <Text style={styles.logoTextLU}>LU</Text>
            </View>
            <Text style={styles.logoTextConnect}>LU CONNECT</Text>
            <View style={{ height: 40 }} />
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" style={{ marginBottom: 16 }} />
            <Text style={styles.successTitle}>MESSAGE SENT</Text>
            <Text style={styles.successSub}>
              Admin will verify your details and send your Account ID to your email. This may take some time.
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 30 }]} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.centerBox}>
              <View style={styles.logoBox}>
                <Text style={styles.logoTextLU}>LU</Text>
              </View>
              <Text style={styles.logoTextConnect}>LU CONNECT</Text>
              <View style={{ height: 30 }} />
            </View>

            <Text style={styles.title}>ACCOUNT RECOVERY</Text>
            <Text style={styles.sub}>
              Because your phone is banned, we need to verify your identity. Enter your details exactly as they appear on your profile.
            </Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Text style={styles.label}>Admission Number</Text>
            <TextInput style={styles.input} placeholder="e.g. ED/ARTS/5014/26" placeholderTextColor="#6d7382" value={admission} onChangeText={setAdmission} autoCapitalize="characters" />

            <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="e.g. 2008-02-03" placeholderTextColor="#6d7382" value={dob} onChangeText={setDob} />

            <Text style={styles.label}>University Name</Text>
            <TextInput style={styles.input} placeholder="Your University" placeholderTextColor="#6d7382" value={university} onChangeText={setUniversity} />

            <Text style={styles.label}>Message to Admin</Text>
            <TextInput 
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
              placeholder="Explain why you are locked out." 
              placeholderTextColor="#6d7382" 
              multiline 
              value={message} 
              onChangeText={setMessage} 
            />

            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: 20 }, !canSubmit && { opacity: 0.5 }]} 
              onPress={handleSubmit} 
              disabled={!canSubmit || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>SEND TO ADMIN</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  
  centerBox: { alignItems: 'center', marginBottom: 20 },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },

  title: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  sub: { color: '#6d7382', fontSize: 13, lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  
  label: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 16, fontSize: 15 },
  
  primaryBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  successTitle: { color: '#22c55e', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  successSub: { color: '#6d7382', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
});
