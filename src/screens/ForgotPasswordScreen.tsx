import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  
  const [accountId, setAccountId] = useState('');
  const [admission, setAdmission] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.rpc('reset_password_with_id', {
        p_recovery_code: accountId.trim(),
        p_admission: admission.trim(),
        p_new_password: newPassword
      });

      if (error) throw error;
      
      if (data) {
        setSuccess(true);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RESET PASSWORD</Text>
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

        {success ? (
          <View style={styles.successWrap}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" style={{ marginBottom: 16 }} />
            <Text style={styles.successTitle}>PASSWORD RESET</Text>
            <Text style={styles.successSub}>Your password has been successfully changed. You can now log in with your new password.</Text>
            
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>BACK TO LOGIN</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.subText}>Enter your Account ID and Admission Number to reset your password.</Text>
            
            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Text style={styles.sectionHeader}>ACCOUNT ID</Text>
            <TextInput 
              style={styles.input} 
              placeholder="LU-XXXX-XXXX-XXXX" 
              placeholderTextColor="#6d7382" 
              value={accountId} 
              onChangeText={setAccountId} 
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>ADMISSION NUMBER</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. ED/ARTS/5014/26" 
              placeholderTextColor="#6d7382" 
              value={admission} 
              onChangeText={setAdmission} 
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>NEW PASSWORD</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Enter new password" 
              placeholderTextColor="#6d7382" 
              secureTextEntry
              value={newPassword} 
              onChangeText={setNewPassword} 
            />

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>CONFIRM PASSWORD</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Confirm new password" 
              placeholderTextColor="#6d7382" 
              secureTextEntry
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
            />

            <TouchableOpacity 
              style={[styles.primaryBtn, (!accountId || !admission || !newPassword || !confirmPassword) && { opacity: 0.5 }]} 
              onPress={handleReset} 
              disabled={!accountId || !admission || !newPassword || !confirmPassword || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>RESET PASSWORD</Text>}
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
  
  logoContainer: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },

  subText: { color: '#6d7382', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 14, fontSize: 15, marginBottom: 8 },
  
  primaryBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderLeftWidth: 2, borderLeftColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 20 },
  errorText: { color: '#ef4444', fontSize: 13, flex: 1, fontWeight: '600' },

  successWrap: { alignItems: 'center', marginTop: 20 },
  successTitle: { color: '#22c55e', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  successSub: { color: '#6d7382', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
});
