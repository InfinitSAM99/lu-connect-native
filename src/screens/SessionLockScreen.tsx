import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator, DevSettings } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceAuth';
import PatternLock from '../components/PatternLock';

const { width: SCREEN_W } = Dimensions.get('window');

export default function SessionLockScreen({ navigation }: any) {
  const { kickoutReason, profile, user, signOut, unlockSession } = useAuth();
  const [showPattern, setShowPattern] = useState(false);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handlePatternComplete = async (pattern: string) => {
    setLoading(true);
    setPatternError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || user?.email || profile?.email;

      if (!email) {
        setPatternError('User session not found. Please sign in again.');
        setLoading(false);
        return;
      }

      const myDeviceId = await getDeviceId();
      const { data, error } = await supabase.rpc('verify_recovery_pattern', {
        p_email: email,
        p_pattern: pattern,
        p_device_id: myDeviceId
      });

      if (error) throw error;

      if (data) {
        await unlockSession();
      } else {
        setPatternError('Incorrect pattern. Try again.');
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('banned') || e.message.includes('locked') || e.message.includes('Too many attempts'))) {
        setIsLocked(true);
        setPatternError(e.message);
      } else {
        setPatternError(e.message || 'Incorrect pattern. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* LU CONNECT LOGO */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoTextLU}>LU</Text>
        </View>
        <Text style={styles.logoTextConnect}>LU CONNECT</Text>
      </View>

      <View style={styles.divider} />

      {showPattern ? (
        <View style={styles.patternContainer}>
          <Text style={styles.patternTitle}>DRAW YOUR PATTERN</Text>
          <Text style={styles.patternSub}>Verify it's you to unlock this session.</Text>
          
          {patternError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{patternError}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
          ) : isLocked ? (
            <View style={styles.lockedWrap}>
              <Ionicons name="lock-closed" size={64} color="#ef4444" />
              <Text style={styles.lockedTitle}>PATTERN LOCKED</Text>
              <Text style={styles.lockedSub}>You have failed 3 times. Contact admin to unlock your account.</Text>
              <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]} onPress={() => navigation.navigate('ContactAdmin')}>
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>CONTACT ADMIN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <PatternLock onComplete={handlePatternComplete} />
          )}

          {!isLocked && (
            <TouchableOpacity onPress={() => { setShowPattern(false); setPatternError(null); setIsLocked(false); }} style={{ marginTop: 30 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* User Profile Card */}
          <View style={styles.profileCard}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() || 'U'}</Text>
              </View>
            )}
            <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
            {profile?.email ? <Text style={styles.email}>{profile.email}</Text> : null}
            {profile?.university_name ? (
              <View style={styles.universityBadge}>
                <Ionicons name="school" size={12} color="#ef4444" />
                <Text style={styles.universityText} numberOfLines={1}>{profile.university_name}</Text>
              </View>
            ) : null}
          </View>

          {/* Warning Message */}
          <View style={styles.warningBox}>
            <Ionicons name="shield-checkmark" size={32} color="#ef4444" />
            <Text style={styles.warningTitle}>Session Ended</Text>
            <Text style={styles.warningMessage}>
              {kickoutReason || 'Your account was signed in on another device for your security.'}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.buttonContainer}>
            
            <TouchableOpacity onPress={() => setShowPattern(true)} style={[styles.primaryBtn, { backgroundColor: '#fff', marginBottom: 12 }]}>
              <Ionicons name="grid" size={20} color="#000" />
              <Text style={[styles.primaryBtnText, { color: '#000' }]}>Draw Pattern to Unlock</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('AccountIdRecovery')} style={[styles.primaryBtn, { backgroundColor: '#1a0d0f', borderWidth: 1, borderColor: '#ef4444', marginBottom: 12 }]}>
              <Ionicons name="key" size={20} color="#ef4444" />
              <Text style={[styles.primaryBtnText, { color: '#ef4444' }]}>Use Account ID to Recover</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => signOut()} style={styles.primaryBtn}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Sign Back In</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                await signOut();
                // Force a full reload of the app to clear the kickout state
                if (__DEV__) {
                  DevSettings.reload();
                } else {
                  // In production, a full reload can be triggered via Updates if needed,
                  // but usually the state change is enough. We'll rely on the state.
                }
              }} 
              style={{ marginTop: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#6d7382', fontSize: 14, fontWeight: '600' }}>Back to Login</Text>
            </TouchableOpacity>
            
            <Text style={styles.footerText}>Only one device can be active at a time.</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 20, alignItems: 'center' },
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
  email: { color: '#6d7382', fontSize: 13, marginBottom: 8 },
  universityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#1a0d0f', borderWidth: 1, borderColor: '#3b1215', maxWidth: SCREEN_W - 96 },
  universityText: { color: '#ef4444', fontSize: 11, fontWeight: '600' },
  
  warningBox: { alignItems: 'center', padding: 20, borderRadius: 16, backgroundColor: '#141414', borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 24, width: '100%' },
  warningTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 6 },
  warningMessage: { color: '#aab0bd', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  
  buttonContainer: { width: '100%', marginTop: 'auto' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 14, width: '100%' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footerText: { color: '#6d7382', fontSize: 11, textAlign: 'center', marginTop: 20 },

  patternContainer: { flex: 1, width: '100%', alignItems: 'center', marginTop: 10 },
  patternTitle: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  patternSub: { color: '#6d7382', fontSize: 13, marginBottom: 16 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.15)', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  cancelText: { color: '#6d7382', fontSize: 14, fontWeight: '600' },

  lockedWrap: { alignItems: 'center', width: '100%', paddingHorizontal: 20, marginTop: 20 },
  lockedTitle: { color: '#ef4444', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginTop: 16, marginBottom: 6 },
  lockedSub: { color: '#6d7382', fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
