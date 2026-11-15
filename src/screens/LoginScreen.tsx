import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import UniversityPickerScreen from './UniversityPickerScreen';
import AuthErrorSheet from '../components/AuthErrorSheet';
import { supabase } from '../lib/supabase';
import BottomSheet from '../components/BottomSheet';
import FastButton from '../components/FastButton';

// --- Icons ---
const MailIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6d7382" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="3" />
    <Path d="m2 7 10 6 10-6" />
  </Svg>
);
const LockIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6d7382" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

function Field({ icon, ...props }: any) {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldIcon}>{icon}</View>
      <TextInput {...props} style={styles.fieldInput} placeholderTextColor="#6d7382" autoCapitalize="none" />
    </View>
  );
}

export default function LoginScreen({ navigation }: any) {
  const { signIn, signUp , resetPassword , kickoutReason } = useAuth();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<'signin' | 'register' | null>(null);
  const closeSheet = () => setSheet(null);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPass, setSignInPass] = useState('');
  const [signInErr, setSignInErr] = useState('');

  // If the user got kicked out, show a friendly message
  React.useEffect(() => {
    if (kickoutReason) setSignInErr(kickoutReason);
  }, [kickoutReason]);
  const [signInLoading, setSignInLoading] = useState(false);

  // Register State
  const [reg, setReg] = useState({ fullName: '', username: '', admissionNumber: '', email: '', password: '', university: '', university_id: '' });
  const [showUniModal, setShowUniModal] = useState(false);
  const [authError, setAuthError] = useState<{ visible: boolean; title: string; message: string; showReset: boolean }>({ visible: false, title: '', message: '', showReset: false });

  // Reset the registration form when the sheet is closed
  React.useEffect(() => {
    if (sheet !== 'register') {
      setReg({ fullName: '', username: '', admissionNumber: '', email: '', password: '', university: '', university_id: '' });
    }
  }, [sheet]);
  // Reset register form every time the screen mounts (fresh session)
  React.useEffect(() => {
    setReg({ fullName: '', username: '', admissionNumber: '', email: '', password: '', university: '', university_id: '' });
  }, []);

  // Reset register form every time the screen mounts (fresh session)
  React.useEffect(() => {
    setReg({ fullName: '', username: '', admissionNumber: '', email: '', password: '', university: '', university_id: '' });
  }, []);

  const [regErr, setRegErr] = useState('');
  const [regMsg, setRegMsg] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleSignIn = async () => {
    setSignInErr('');
    setSignInLoading(true);
    try {
      const { error } = await signIn(signInEmail.trim(), signInPass);
      if (error) {
        // Parse the Supabase error
        const msg = error.message || 'Invalid login credentials';
        let title = 'Login failed';
        let friendly = 'The email or password you entered is incorrect.';
        let showReset = true;

        if (msg.toLowerCase().includes('email not confirmed')) {
          title = 'Email not verified';
          friendly = 'Please check your inbox and click the verification link we sent you.';
          showReset = false;
        } else if (msg.toLowerCase().includes('invalid login credentials')) {
          title = 'Invalid email or password';
          friendly = 'Double-check your email and password. If you forgot your password, tap Reset password below.';
        } else {
          friendly = msg;
        }

        setAuthError({ visible: true, title, message: friendly, showReset });
      }
    } catch (e: any) {
      setAuthError({
        visible: true,
        title: 'Connection error',
        message: e.message || 'Could not reach the server. Please try again.',
        showReset: false,
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!signInEmail.trim()) return setSignInErr('Enter your email address first to reset your password.');
    setSignInLoading(true);
    setSignInErr('');
    try {
      const { error } = await resetPassword(signInEmail.trim());
      if (error) throw error;
      setSignInErr('');
      alert('Password reset link sent to your email. Check your inbox.');
    } catch (e: any) {
      setSignInErr(e.message);
    } finally {
      setSignInLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegErr(''); setRegMsg('');
    if (!reg.university) return setRegErr('Please select your university');
    
    // Strict Password Validation
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;
    if (!strongRegex.test(reg.password)) {
      return setRegErr('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special symbol (e.g., @, #, $, !).');
    }

    setRegLoading(true);
    try {
      const { error } = await signUp(reg.email, reg.password, reg.fullName, reg.username, reg.admissionNumber, reg.university, reg.university_id);
      setRegLoading(false);
      if (error) return setRegErr(error.message);
      setRegMsg('Account created! Check your email to verify, then wait for admin approval.');
      setTimeout(() => { closeSheet(); setSheet('signin'); }, 3500);
    } catch (e: any) {
      setRegLoading(false); setRegErr(e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Svg viewBox="0 0 200 200" width={120} height={120}>
            <Rect x="14" y="14" width="172" height="172" rx="34" fill="none" stroke="#ef4444" strokeWidth={5} />
            <Path d="M 62 60 L 62 130 L 96 130" fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.title}>LU CONNECT</Text>
          <Text style={styles.subtitle}>Connect with your university community</Text>
        </View>

        <View style={styles.actions}>
          <FastButton style={styles.primaryBtn} onPress={() => setSheet('signin')}>
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </FastButton>
          
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <TouchableOpacity 
              style={[styles.socialBtn, { backgroundColor: '#141414', borderColor: '#2a2a2a' }]} 
              onPress={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'luconnect://auth-callback' } })}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </Svg>
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialBtn, { backgroundColor: 'rgba(24,119,242,0.15)', borderColor: 'rgba(24,119,242,0.3)' }]} 
              onPress={() => supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: 'luconnect://auth-callback' } })}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="#1877F2">
                <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </Svg>
              <Text style={[styles.socialBtnText, { color: '#1877F2' }]}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1f1f1f' }} />
            <Text style={{ color: '#6d7382', marginHorizontal: 10, fontSize: 12, fontWeight: '600' }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1f1f1f' }} />
          </View>
          <FastButton style={styles.secondaryBtn} onPress={() => setSheet('register')}>
            <Text style={styles.secondaryBtnText}>Create account</Text>
          </FastButton>
          <Text style={styles.credit}>by Samuel Mugasia</Text>
        </View>
      </ScrollView>

      {/* SIGN IN SHEET */}
      <BottomSheet open={sheet === 'signin'} onClose={closeSheet} maxHeight="90vh">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.sheetTitle}>Welcome back</Text>
          <Text style={styles.sheetSubtitle}>Sign in to continue</Text>

          {signInErr ? <View style={styles.errBox}><Text style={styles.errText}>{signInErr}</Text></View> : null}

          <Text style={styles.label}>Email</Text>
          <Field icon={<MailIcon />} keyboardType="email-address" value={signInEmail} onChangeText={setSignInEmail} placeholder="you@university.edu" />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <Field icon={<LockIcon />} secureTextEntry value={signInPass} onChangeText={setSignInPass} placeholder="Your password" />
          <FastButton style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleSignIn} disabled={signInLoading}>
            <Text style={styles.primaryBtnText}>{signInLoading ? 'Signing in…' : 'Sign in'}</Text>
          </FastButton>

        </ScrollView>
      </BottomSheet>

      {/* REGISTER SHEET */}
      <BottomSheet open={sheet === 'register'} onClose={closeSheet} maxHeight="92vh">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.sheetTitle}>Join LU CONNECT</Text>
          <Text style={styles.sheetSubtitle}>Create your student account</Text>

          {regErr ? <View style={styles.errBox}><Text style={styles.errText}>{regErr}</Text></View> : null}
          {regMsg ? <View style={styles.msgBox}><Text style={styles.msgText}>{regMsg}</Text></View> : null}

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={reg.fullName} onChangeText={(v) => setReg({ ...reg, fullName: v })} placeholder="Your full name" placeholderTextColor="#6d7382" />

          <Text style={[styles.label, { marginTop: 12 }]}>Username</Text>
          <TextInput style={styles.input} value={reg.username} onChangeText={(v) => setReg({ ...reg, username: v })} placeholder="Choose a username" placeholderTextColor="#6d7382" autoCapitalize="none" />

          <Text style={[styles.label, { marginTop: 12 }]}>Admission / Registration Number</Text>
          <TextInput style={styles.input} value={reg.admissionNumber} onChangeText={(v) => setReg({ ...reg, admissionNumber: v })} placeholder="Your admission number" placeholderTextColor="#6d7382" />

          <Text style={[styles.label, { marginTop: 12 }]}>University</Text>
          <FastButton 
            style={styles.fieldContainer} 
            onPress={() => setShowUniModal(true)}
          >
            <View style={styles.fieldIcon}><Ionicons name="school" size={20} color="#6d7382" /></View>
            <Text style={{ flex: 1, color: reg.university ? '#fff' : '#6d7382', fontSize: 15, paddingVertical: 14 }}>{reg.university || 'Choose your university'}</Text>
            <Ionicons name="chevron-forward" size={18} color="#6d7382" />
          </FastButton>

          <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
          <TextInput style={styles.input} keyboardType="email-address" value={reg.email} onChangeText={(v) => setReg({ ...reg, email: v })} placeholder="you@university.edu" placeholderTextColor="#6d7382" autoCapitalize="none" />

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <TextInput style={styles.input} secureTextEntry value={reg.password} onChangeText={(v) => setReg({ ...reg, password: v })} placeholder="8+ chars, Uppercase, Number, Symbol" placeholderTextColor="#6d7382" />

          <FastButton style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleRegister} disabled={regLoading}>
            <Text style={styles.primaryBtnText}>{regLoading ? 'Creating account…' : 'Create account'}</Text>
          </FastButton>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 18 }}>
            <Text style={{ fontSize: 13, color: '#6d7382' }}>Have an account? </Text>
            <TouchableOpacity onPress={() => setSheet('signin')}>
              <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '600' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheet>

      <AuthErrorSheet
        visible={authError.visible}
        title={authError.title}
        message={authError.message}
        showReset={authError.showReset}
        onClose={() => setAuthError({ ...authError, visible: false })}
        onReset={() => {
          setAuthError({ ...authError, visible: false });
          setTimeout(() => {
            closeSheet();
            navigation.navigate('ForgotPassword');
          }, 300);
        }}
      />

      {/* UNIVERSITY PICKER MODAL */}
      <Modal visible={showUniModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowUniModal(false)}>
        <UniversityPickerScreen
          onSelect={(item: any) => {
            setReg({ ...reg, university: item.name, university_id: item.id });
            setShowUniModal(false);
          }}
          onClose={() => setShowUniModal(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', letterSpacing: 0.5, marginTop: 18 },
  subtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', maxWidth: 280, marginTop: 8, lineHeight: 20 },
  actions: { width: '100%', maxWidth: 380, alignSelf: 'center', gap: 14 },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#1f1f1f', borderRadius: 16, padding: 16, alignItems: 'center' },

  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  socialBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  credit: { fontSize: 12, color: '#6d7382', textAlign: 'center', marginTop: 22, letterSpacing: 0.4 },
  
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '500', color: '#6d7382', marginBottom: 6, marginLeft: 4 },
  fieldContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#141414', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 },
  fieldIcon: { color: '#6d7382' },
  fieldInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15 },
  errBox: { backgroundColor: 'rgba(239,68,68,0.14)', padding: 12, borderRadius: 12, marginBottom: 14 },
  errText: { color: '#ef4444', fontSize: 13, lineHeight: 18 },
  msgBox: { backgroundColor: 'rgba(34,197,94,0.14)', padding: 12, borderRadius: 12, marginBottom: 14 },
  msgText: { color: '#22c55e', fontSize: 13, lineHeight: 18 },
});
