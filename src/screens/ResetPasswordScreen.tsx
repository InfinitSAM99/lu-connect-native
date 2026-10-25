import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';

const LockIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6d7382" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export default function ResetPasswordScreen({ navigation }: any) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(err.message);
    else setDone(true);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Svg viewBox="0 0 200 200" width={88} height={88}>
            <Rect x="14" y="14" width="172" height="172" rx="34" fill="none" stroke="#ef4444" strokeWidth={5} />
            <Path d="M 62 60 L 62 130 L 96 130" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.secureText}>SECURE YOUR ACCOUNT</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>Choose a strong password you haven't used before</Text>
        </View>

        <View style={styles.form}>
          {done ? (
            <>
              <View style={styles.msgBox}><Text style={styles.msgText}>Your password has been updated</Text></View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.primaryBtnText}>Continue to sign in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {error ? <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View> : null}

              <View style={styles.fieldContainer}>
                <LockIcon />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#6d7382"
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy}>
                <Text style={styles.primaryBtnText}>{busy ? 'Updating…' : 'Update password'}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 22 }}>
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          <Text style={styles.credit}>by Samuel Mugasia</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  secureText: { fontSize: 13, color: '#6d7382', letterSpacing: 1.2, fontWeight: '500', textTransform: 'uppercase', marginTop: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 8 },
  form: { width: '100%', maxWidth: 380, alignSelf: 'center' },
  fieldContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#141414', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 20 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 16 },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errBox: { backgroundColor: 'rgba(239,68,68,0.14)', padding: 12, borderRadius: 12, marginBottom: 14 },
  errText: { color: '#ef4444', fontSize: 13, lineHeight: 18 },
  msgBox: { backgroundColor: 'rgba(34,197,94,0.14)', padding: 14, borderRadius: 14, marginBottom: 16 },
  msgText: { color: '#22c55e', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  backText: { color: '#ef4444', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  credit: { fontSize: 12, color: '#6d7382', textAlign: 'center', marginTop: 40, letterSpacing: 0.4 },
});
