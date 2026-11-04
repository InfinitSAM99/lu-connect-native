import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, LayoutAnimation, Platform, UIManager, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PatternLock from '../components/PatternLock';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

export default function SetPatternScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [step, setStep] = useState<'loading' | 'draw' | 'confirm' | 'saving' | 'success' | 'locked'>('loading');
  const [firstPattern, setFirstPattern] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockDate, setLockDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('account_recovery')
        .select('pattern_locked_until')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (data?.pattern_locked_until && new Date(data.pattern_locked_until) > new Date()) {
        setLockDate(new Date(data.pattern_locked_until).toLocaleDateString());
        setStep('locked');
      } else {
        setStep('draw');
      }
    })();
  }, [profile?.id]);

  const handlePatternComplete = async (pattern: string) => {
    // Smooth drawer animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setErrorMsg(null);
    
    if (step === 'draw') {
      if (pattern.length < 4) {
        setErrorMsg('Connect at least 4 dots.');
        return;
      }
      setFirstPattern(pattern);
      setStep('confirm');
    } 
    else if (step === 'confirm') {
      if (pattern !== firstPattern) {
        setErrorMsg('Patterns do not match. Try again.');
        setFirstPattern('');
        setStep('draw');
        return;
      }

      setStep('saving');
      try {
        const { error } = await supabase.rpc('set_recovery_pattern', { p_pattern: pattern });
        if (error) throw error;
        
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 5);
        setLockDate(futureDate.toLocaleDateString());
        
        setStep('success');
      } catch (e: any) {
        setErrorMsg('Database Error: ' + (e.message || 'Failed to save pattern'));
        setStep('draw');
        setFirstPattern('');
      }
    }
  };

  // Header Component
  const renderHeader = () => (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PATTERN LOCK</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.logoSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoTextLU}>LU</Text>
        </View>
        <Text style={styles.logoTextConnect}>LU CONNECT</Text>
      </View>
      <View style={styles.divider} />
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <View style={styles.content}>
        {step === 'loading' && (
          <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
        )}

        {step === 'locked' && (
          <View style={styles.centerBox}>
            <Ionicons name="lock-closed" size={64} color="#ef4444" style={{ marginBottom: 16 }} />
            <Text style={styles.title}>PATTERN LOCKED</Text>
            <Text style={styles.sub}>To prevent account theft, you cannot change your recovery pattern until:</Text>
            <Text style={styles.dateText}>{lockDate}</Text>
            <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 30 }]} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>GO BACK</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'success' && (
          <View style={styles.centerBox}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" style={{ marginBottom: 16 }} />
            <Text style={styles.successTitle}>PATTERN SAVED</Text>
            <Text style={styles.sub}>If your phone is stolen, draw this pattern on your new phone to kick the thief out and recover your account instantly.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 30 }]} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        )}

        {(step === 'draw' || step === 'confirm' || step === 'saving') && (
          <View style={styles.gridContainer}>
            <Text style={styles.drawTitle}>
              {step === 'draw' ? 'DRAW NEW PATTERN' : step === 'confirm' ? 'CONFIRM PATTERN' : 'SAVING...'}
            </Text>
            <Text style={styles.drawSub}>
              {step === 'draw' ? 'Connect at least 4 dots.' : step === 'confirm' ? 'Draw the same pattern again.' : 'Locking for 5 months.'}
            </Text>

            {/* Error Drawer */}
            <View style={styles.errorSpace}>
              {errorMsg && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}
            </View>

            {step === 'saving' ? (
              <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 20 }} />
            ) : (
              <PatternLock onComplete={handlePatternComplete} key={step} />
            )}
            
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 30 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  headerContainer: { backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  
  logoSection: { alignItems: 'center', paddingBottom: 24 },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  divider: { height: 1, backgroundColor: '#1f1f1f' },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  
  gridContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  
  title: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  successTitle: { color: '#22c55e', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  drawTitle: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 2, marginBottom: 6, textAlign: 'center' },
  drawSub: { color: '#6d7382', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  
  sub: { color: '#6d7382', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  dateText: { color: '#ef4444', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginTop: 16 },
  
  errorSpace: { height: 50, justifyContent: 'center', marginBottom: 10 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderLeftWidth: 2, borderLeftColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  
  cancelText: { color: '#6d7382', fontSize: 14, fontWeight: '600', marginTop: 20 },

  primaryBtn: { backgroundColor: '#ef4444', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
