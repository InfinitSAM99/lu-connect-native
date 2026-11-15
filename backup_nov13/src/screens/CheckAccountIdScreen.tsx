import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function CheckAccountIdScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const isLoggedIn = !!user && !!profile;
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  

  React.useEffect(() => {
    if (isLoggedIn && profile?.id) {
      const fetchMyQuestions = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('account_recovery')
            .select('questions')
            .eq('user_id', profile.id)
            .maybeSingle();
          
          if (error) throw error;
          if (data && data.questions) {
            const formatted = data.questions.map((q: any) => ({ label: q.q || q }));
            setQuestions(formatted);
          } else {
            setErrorMsg('No security questions found for your account.');
          }
        } catch (e: any) {
          setErrorMsg(e.message);
        } finally {
          setLoading(false);
        }
      };
      fetchMyQuestions();
    }
  }, [isLoggedIn, profile?.id]);

  // Step 1: Fetch the questions for this email
  const handleFetchQuestions = async () => {
    if (!email) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // We fetch using the admin RPC to avoid logging in
      const { data, error } = await supabase.rpc('get_recovery_questions', { p_email: email.trim() });
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No security questions set for this email.');

      setQuestions(data);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reveal the ID
  const handleReveal = async () => {
    if (Object.keys(answers).length !== 3) return;
    if (!isLoggedIn && !password) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const ansArray = [answers[0], answers[1], answers[2]];

      // Use the RPC for both logged-in and logged-out users for consistency
      const { data, error } = await supabase.rpc('reveal_account_id', {
        p_email: isLoggedIn ? profile.email : email.trim(),
        p_password: password,
        p_answers: ansArray
      });

      if (error) throw error;
      if (data) {
        setRevealedCode(data);
      } else {
        setErrorMsg('Incorrect password or answers.');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (revealedCode) {
      await Clipboard.setStringAsync(revealedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REVEAL ACCOUNT ID</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        
        {/* LU CONNECT LOGO */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoTextLU}>LU</Text>
          </View>
          <Text style={styles.logoTextConnect}>LU CONNECT</Text>
        </View>

        {revealedCode ? (
          <View style={styles.successWrap}>
            <Ionicons name="key" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
            <Text style={styles.successTitle}>YOUR ACCOUNT ID</Text>
            <Text style={styles.codeText}>{revealedCode}</Text>

            <TouchableOpacity style={styles.copyBtn} onPress={copyToClipboard}>
              <Ionicons name={copied ? "checkmark" : "copy"} size={20} color={copied ? "#22c55e" : "#fff"} />
              <Text style={[styles.copyBtnText, copied && { color: '#22c55e' }]}>
                {copied ? 'COPIED TO CLIPBOARD' : 'COPY TO CLIPBOARD'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.successSub}>Write this down and keep it safe. You can only view it once every 24 hours.</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {questions.length === 0 ? (
              // If logged in and questions aren't loaded yet
              isLoggedIn ? (
                <Text style={styles.subText}>Loading your security questions...</Text>
              ) : (
                // Logged out flow
                <>
                  <Text style={styles.subText}>Enter your email to find your security questions.</Text>
                  <Text style={styles.sectionHeader}>EMAIL</Text>
                  <TextInput style={styles.input} placeholder="you@university.edu" placeholderTextColor="#6d7382" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  <TouchableOpacity style={[styles.primaryBtn, !email && { opacity: 0.5 }]} onPress={handleFetchQuestions} disabled={!email || loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>FIND ACCOUNT</Text>}
                  </TouchableOpacity>
                </>
              )
            ) : (
              <>
                {/* Password field is completely hidden for logged-in users */}
                {!isLoggedIn && (
                  <>
                    <Text style={styles.sectionHeader}>PASSWORD</Text>
                    <TextInput style={styles.input} placeholder="Your password" placeholderTextColor="#6d7382" secureTextEntry value={password} onChangeText={setPassword} />
                  </>
                )}

                <Text style={[styles.sectionHeader, { marginTop: 20 }]}>SECURITY QUESTIONS</Text>
                {questions.map((q, i) => (
                  <View key={i} style={{ marginBottom: 16 }}>
                    <Text style={styles.qLabel}>{q.label}</Text>
                    <TextInput style={styles.input} placeholder="Your answer" placeholderTextColor="#6d7382" value={answers[i] || ''} onChangeText={(t) => setAnswers(prev => ({...prev, [i]: t}))} autoCapitalize="none" />
                  </View>
                ))}

                <TouchableOpacity style={[styles.primaryBtn, (!isLoggedIn && !password) || Object.keys(answers).length !== 3 ? { opacity: 0.5 } : null]} onPress={handleReveal} disabled={(!isLoggedIn && !password) || Object.keys(answers).length !== 3 || loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>REVEAL ACCOUNT ID</Text>}
                </TouchableOpacity>
              </>
            )}
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

  logoContainer: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },

  subText: { color: '#6d7382', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 14, fontSize: 15, marginBottom: 8 },
  qLabel: { color: '#fff', fontSize: 14, marginBottom: 6, fontWeight: '500' },

  primaryBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 20, fontSize: 13, fontWeight: '600' },

  successWrap: { alignItems: 'center', marginTop: 20 },
  successTitle: { color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 16 },
  codeText: { color: '#ef4444', fontSize: 22, fontWeight: '900', letterSpacing: 2, padding: 20, backgroundColor: '#141414', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', textAlign: 'center', width: '100%' },
  successSub: { color: '#6d7382', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 },

  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1f1f1f', padding: 14, borderRadius: 12, marginTop: 16, width: '100%' },
  copyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
