import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function SecurityQuestionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If they have active locks, we show a different view
  const [lockScreenDate, setLockScreenDate] = useState<string | null>(null);

  // Form states
  const [customQuestions, setCustomQuestions] = useState<string[]>(['', '', '']);
  const [customAnswers, setCustomAnswers] = useState<string[]>(['', '', '']);

  const fetchRecoveryData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('account_recovery')
        .select('questions, questions_locked_until, pattern_locked_until')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      let activeLock: string | null = null;

      if (data?.questions_locked_until) {
        const qDate = new Date(data.questions_locked_until);
        if (qDate > new Date()) activeLock = qDate.toLocaleDateString();
      }
      if (data?.pattern_locked_until) {
        const pDate = new Date(data.pattern_locked_until);
        if (pDate > new Date() && !activeLock) activeLock = pDate.toLocaleDateString();
      }

      if (activeLock) {
        setLockScreenDate(activeLock);
      } else if (data?.questions && data.questions.length > 0) {
        // Pre-fill existing questions if they exist
        const existingQ = data.questions.map((q: any) => q.q || q);
        const existingA = data.questions.map((q: any) => q.a || '');
        setCustomQuestions([existingQ[0] || '', existingQ[1] || '', existingQ[2] || '']);
        setCustomAnswers([existingA[0] || '', existingA[1] || '', existingA[2] || '']);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchRecoveryData();
  }, [fetchRecoveryData]);

  const handleSave = async () => {
    setErrorMsg(null);
    
    // Validate
    if (customQuestions.some(q => !q.trim()) || customAnswers.some(a => !a.trim())) {
      setErrorMsg('Please fill in all 3 questions and answers.');
      return;
    }

    setSaving(true);
    try {
      const questionsData = customQuestions.map((q, i) => ({
        q: q.trim(),
        a: customAnswers[i].trim().toLowerCase()
      }));

      // Lock for 5 months (approx 150 days)
      const lockDate = new Date();
      lockDate.setDate(lockDate.getDate() + 150);

      const { error } = await supabase.from('account_recovery').upsert({
        user_id: profile.id,
        questions: questionsData,
        questions_locked_until: lockDate.toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      
      Alert.alert('Success', 'Security questions saved and locked for 5 months.');
      navigation.goBack();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  // If the account is locked from changing questions
  if (lockScreenDate) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed" size={60} color="#ef4444" />
        <Text style={styles.lockTitle}>Questions Locked</Text>
        <Text style={styles.lockSub}>You cannot change your security questions until {lockScreenDate}.</Text>
        <TouchableOpacity style={styles.backBtn2} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SECURITY QUESTIONS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>RECOVER YOUR ACCOUNT</Text>
        <Text style={styles.subtitle}>
          Create 3 custom questions. These will be used to verify your identity and reveal your Account ID if you get locked out. You cannot change them for 5 months after saving.
        </Text>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Text style={styles.sectionHeader}>CREATE 3 CUSTOM SECURITY QUESTIONS</Text>
        
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.questionBlock}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.customInput}
                placeholder={`Type your question ${index + 1} here`}
                placeholderTextColor="#6d7382"
                value={customQuestions[index]}
                onChangeText={(text) => {
                  const newQ = [...customQuestions];
                  newQ[index] = text;
                  setCustomQuestions(newQ);
                }}
              />
              <TextInput
                style={styles.answerInput}
                placeholder="Type your answer"
                placeholderTextColor="#6d7382"
                value={customAnswers[index]}
                onChangeText={(text) => {
                  const newA = [...customAnswers];
                  newA[index] = text;
                  setCustomAnswers(newA);
                }}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE AND LOCK FOR 5 MONTHS</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: '#6d7382', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 12, marginBottom: 16 },
  
  questionBlock: { flexDirection: 'row', backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  numberBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  numberText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  customInput: { color: '#fff', fontSize: 15, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#1f1f1f', paddingVertical: 8, marginBottom: 8 },
  answerInput: { color: '#aab0bd', fontSize: 14, paddingVertical: 8 },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.14)', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },

  saveBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  lockTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  lockSub: { color: '#6d7382', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  backBtn2: { backgroundColor: '#1f1f1f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
