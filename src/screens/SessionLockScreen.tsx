import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

export default function SessionLockScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { kickoutReason, profile, user, signOut, unlockSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');

  // Fallback to Google metadata if profile hasn't loaded yet
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'LU Connect User';
  const displayAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;

  const requestOTP = async () => {
    setLoading(true);
    const email = user?.email || profile?.email;
    if (!email) {
      setLoading(false);
      return Alert.alert("Error", "No email found.");
    }

    const { error } = await supabase.from('otp_codes').insert({
      email,
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    setLoading(false);
    if (error) return Alert.alert("Error", error.message);
    
    setOtpSent(true);
    Alert.alert("Request Sent", "Admin has been notified to send your code.");
  };

  const verifyCode = async () => {
    setLoading(true);
    const email = user?.email || profile?.email;
    const deviceId = await getDeviceId();

    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('status', 'sent')
      .single();

    if (error || !data) {
      setLoading(false);
      return Alert.alert("Error", "Invalid or expired code.");
    }

    await supabase.from('otp_codes').update({ status: 'verified' }).eq('id', data.id);

    await supabase.from('profiles').update({ 
      active_device_id: deviceId, 
      transfer_request_id: null 
    }).eq('id', profile.id);

    setLoading(false);
    await unlockSession();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">
        
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoTextLU}>LU</Text>
          </View>
          <Text style={styles.logoTextConnect}>LU CONNECT</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileCard}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="shield-checkmark" size={32} color="#ef4444" />
          <Text style={styles.warningTitle}>New Device Detected</Text>
          <Text style={styles.warningMessage}>
            {kickoutReason || 'Your account is currently active on another device. Please verify this new device to continue.'}
          </Text>
        </View>

        {otpSent ? (
          <View style={{ width: '100%', marginTop: 20 }}>
            <Text style={{ color: '#fff', marginBottom: 10, textAlign: 'center', fontWeight: '600' }}>Enter the 6-digit code:</Text>
            <View style={styles.inputWrap}>
              <TextInput 
                style={styles.inputText} 
                placeholder="000000" 
                placeholderTextColor="#6d7382"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <TouchableOpacity onPress={verifyCode} style={[styles.primaryBtn, { marginTop: 20 }]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify Code</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={requestOTP} style={[styles.primaryBtn, { backgroundColor: '#fff', marginBottom: 12 }]} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : (
                <>
                  <Ionicons name="mail" size={20} color="#000" />
                  <Text style={[styles.primaryBtnText, { color: '#000' }]}>Request OTP via Email</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => signOut()} style={styles.primaryBtn}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Sign Back In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  logoBox: { width: 90, height: 90, borderRadius: 24, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 12 },
  logoTextLU: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  divider: { width: SCREEN_W - 48, height: 1, backgroundColor: '#1f1f1f', marginVertical: 20 },
  profileCard: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#ef4444', marginBottom: 10 },
  avatarPlaceholder: { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#ef4444', fontSize: 28, fontWeight: '800' },
  name: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  warningBox: { alignItems: 'center', padding: 20, borderRadius: 16, backgroundColor: '#141414', borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 24, width: '100%' },
  warningTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 6 },
  warningMessage: { color: '#aab0bd', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  buttonContainer: { width: '100%', marginTop: 'auto' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 14, width: '100%' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  inputText: { flex: 1, color: '#fff', fontSize: 24, textAlign: 'center', letterSpacing: 10, fontWeight: '700' }
});
