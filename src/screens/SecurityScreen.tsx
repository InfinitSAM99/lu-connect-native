import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function SecurityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const { profile } = useAuth();
  const [hasQuestions, setHasQuestions] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkRecovery = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('account_recovery')
        .select('questions')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (data && data.questions && data.questions.length > 0) {
        setHasQuestions(true);
      } else {
        setHasQuestions(false);
      }
      setChecking(false);
    };
    checkRecovery();
  }, [profile?.id]);

  const handleSecureNavigation = (targetScreen: string) => {
    // Just navigate directly, let the target screen handle the logic
    navigation.navigate(targetScreen);
  };


  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.heroContent}>
          <Ionicons name="shield-checkmark" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Security</Text>
          <Text style={styles.heroSub}>Protect your account and recover it if you get locked out.</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        
        <Text style={styles.sectionHeader}>RECOVERY</Text>
        
        {/* PATTERN LOCK */}
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('SetPattern')} activeOpacity={0.7}>
          <View style={styles.iconWrap}>
            <Ionicons name="grid" size={24} color="#ef4444" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.rowTitle}>Pattern Lock</Text>
            <Text style={styles.rowDesc}>Draw a pattern to recover your account if your phone is stolen.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* SECURITY QUESTIONS */}
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('SecurityQuestions')} activeOpacity={0.7}>
          <View style={styles.iconWrap}>
            <Ionicons name="help-circle" size={24} color="#ef4444" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.rowTitle}>Security Questions</Text>
            <Text style={styles.rowDesc}>Set custom questions to verify your identity.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
        </TouchableOpacity>

        <View style={styles.divider} />
        
        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>ACCOUNT</Text>

        {/* VIEW ACCOUNT ID */}
        <TouchableOpacity style={styles.row} onPress={() => handleSecureNavigation('CheckAccountId')} activeOpacity={0.7}>
          <View style={styles.iconWrap}>
            <Ionicons name="key" size={24} color="#ef4444" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.rowTitle}>View Account ID</Text>
            <Text style={styles.rowDesc}>{hasQuestions ? 'Reveal your Account ID to help reset your password.' : 'Requires Security Questions to be set up first.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* RESET PASSWORD */}
        <TouchableOpacity style={styles.row} onPress={() => handleSecureNavigation('ForgotPassword')} activeOpacity={0.7}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-open" size={24} color="#ef4444" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.rowTitle}>Reset Password</Text>
            <Text style={styles.rowDesc}>{hasQuestions ? 'Change your password using your Account ID and Admission Number.' : 'Requires Security Questions to be set up first.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
        </TouchableOpacity>

        <View style={styles.divider} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hero: { paddingHorizontal: 16, paddingBottom: 24, backgroundColor: '#000' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent: { alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  heroSub: { color: '#6d7382', fontSize: 13, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },
  
  sectionHeader: { 
    color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, 
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 
  },
  
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16 },
  iconWrap: { width: 36, alignItems: 'flex-start' },
  textWrap: { flex: 1, paddingRight: 16 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  rowDesc: { color: '#6d7382', fontSize: 13, lineHeight: 18 },
});
