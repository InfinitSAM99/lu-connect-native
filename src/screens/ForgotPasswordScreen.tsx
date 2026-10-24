import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(''); setMsg('');
    if (!email) return setErr('Please enter your email');
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('/reset-password'),
    });
    setLoading(false);

    if (error) setErr(error.message);
    else setMsg('Password reset link sent to your email.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset password</Text>
          
          {err ? <Text style={styles.errorText}>{err}</Text> : null}
          {msg ? <Text style={styles.successText}>{msg}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email"
            placeholderTextColor="#6d7382"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Pressable style={styles.button} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset link</Text>}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  card: { backgroundColor: '#141414', borderColor: '#262626', borderWidth: 1, borderRadius: 16, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 },
  label: { fontSize: 12, color: '#6d7382', marginBottom: 6, marginLeft: 4 },
  input: { backgroundColor: '#0a0a0a', borderColor: '#262626', borderWidth: 1, borderRadius: 12, color: '#fff', fontSize: 15, padding: 16, marginBottom: 16 },
  button: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkText: { color: '#ef4444', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#ef4444', marginBottom: 12 },
  successText: { color: '#22c55e', marginBottom: 12 },
});
