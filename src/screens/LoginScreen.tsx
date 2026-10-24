import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';

function LuLogo({ size = 120 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Rect x="14" y="14" width="172" height="172" rx="34" stroke="#ef4444" strokeWidth="5" fill="none" />
      <Path d="M 62 60 L 62 130 L 96 130" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function BottomSheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

function Field({ placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize }) {
  return (
    <View style={styles.fieldContainer}>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor="#6d7382"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export default function LoginScreen({ navigation }: any) {
  const [sheet, setSheet] = useState<'signin' | 'register' | null>(null);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // Register State
  const [reg, setReg] = useState({ fullName: '', username: '', admissionNumber: '', email: '', password: '' });
  const [regErr, setRegErr] = useState('');
  const [regMsg, setRegMsg] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleSignIn = async () => {
    setErr('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
  };

  const handleRegister = async () => {
    setRegErr(''); setRegMsg('');
    setRegLoading(true);
    const { error } = await supabase.auth.signUp({
      email: reg.email,
      password: reg.password,
      options: { data: { full_name: reg.fullName, username: reg.username, admission_number: reg.admissionNumber } },
    });
    setRegLoading(false);
    if (error) setRegErr(error.message);
    else {
      setRegMsg('Check your email to verify your account.');
      setTimeout(() => { setSheet('signin'); setRegMsg(''); }, 3500);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoSection}>
        <LuLogo size={120} />
        <Text style={styles.title}>LU CONNECT</Text>
        <Text style={styles.subtitle}>Connect with your university community</Text>
      </View>

      <View style={styles.buttonGroup}>
        <Pressable style={styles.primaryButton} onPress={() => setSheet('signin')}>
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => setSheet('register')}>
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </Pressable>
        <Text style={styles.signature}>by Samuel Mugasia</Text>
      </View>

      {/* SIGN IN SHEET */}
      <BottomSheet visible={sheet === 'signin'} onClose={() => setSheet(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.sheetTitle}>Welcome back</Text>
          <Text style={styles.sheetSubtitle}>Sign in to continue</Text>

          {err ? <Text style={styles.errorText}>{err}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <Field placeholder="you@university.edu" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password</Text>
          <Field placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry />

          <Pressable onPress={() => { setSheet(null); navigation.navigate('ForgotPassword'); }} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={handleSignIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
          </Pressable>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* REGISTER SHEET */}
      <BottomSheet visible={sheet === 'register'} onClose={() => setSheet(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.sheetTitle}>Join LU CONNECT</Text>
          <Text style={styles.sheetSubtitle}>Create your student account</Text>

          {regErr ? <Text style={styles.errorText}>{regErr}</Text> : null}
          {regMsg ? <Text style={styles.successText}>{regMsg}</Text> : null}

          <Text style={styles.label}>Full Name</Text>
          <Field placeholder="Your full name" value={reg.fullName} onChangeText={(t: string) => setReg({...reg, fullName: t})} />
          
          <Text style={styles.label}>Username</Text>
          <Field placeholder="Choose a username" value={reg.username} onChangeText={(t: string) => setReg({...reg, username: t})} autoCapitalize="none" />
          
          <Text style={styles.label}>Admission Number</Text>
          <Field placeholder="Your admission number" value={reg.admissionNumber} onChangeText={(t: string) => setReg({...reg, admissionNumber: t})} />
          
          <Text style={styles.label}>Email</Text>
          <Field placeholder="you@university.edu" value={reg.email} onChangeText={(t: string) => setReg({...reg, email: t})} keyboardType="email-address" autoCapitalize="none" />
          
          <Text style={styles.label}>Password</Text>
          <Field placeholder="Min 6 characters" value={reg.password} onChangeText={(t: string) => setReg({...reg, password: t})} secureTextEntry />

          <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={regLoading}>
            {regLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create account</Text>}
          </Pressable>
        </KeyboardAvoidingView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', paddingHorizontal: 24 },
  logoSection: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 18 },
  subtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', marginTop: 8, maxWidth: 280 },
  buttonGroup: { gap: 14 },
  primaryButton: { backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryButton: { borderWidth: 1.5, borderColor: '#262626', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  signature: { fontSize: 12, color: '#6d7382', textAlign: 'center', marginTop: 22 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheetContainer: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#262626', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 12, color: '#6d7382', marginBottom: 6, marginLeft: 4 },
  fieldContainer: { backgroundColor: '#0a0a0a', borderColor: '#262626', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, marginBottom: 14 },
  fieldInput: { color: '#fff', fontSize: 15, paddingVertical: 14 },
  errorText: { backgroundColor: 'rgba(239,68,68,0.14)', color: '#ef4444', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 14 },
  successText: { backgroundColor: 'rgba(34,197,94,0.14)', color: '#22c55e', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 14 },
});
