import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

export default function ProfileEditScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth();

  const [form, setForm] = useState({
    full_name: '', faculty: '', course: '', academicLevel: '',
    location: '', hometown: '', residence: '', relationship: '', birthday: '', interests: ''
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  
  // The Wizard State
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || '',
      faculty: profile.faculty || '',
      course: profile.course || '',
      academicLevel: profile.year_of_study || '',
      location: profile.location || '',
      hometown: profile.hometown || '',
      residence: profile.residence || '',
      relationship: profile.relationship || '',
      birthday: profile.birthday || '',
      interests: profile.interests || '',
    });
    setAvatarUrl(profile.avatar_url || '');
  }, [profile?.id]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled) return;
    setUploadingAvatar(true);
    try {
      const file = result.assets[0];
      const ext = file.uri.split('.').pop() || 'jpg';
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (e: any) {
      setErr('Upload failed: ' + e.message);
    } finally { setUploadingAvatar(false); }
  };

  const save = async () => {
    if (!profile) return;
    setErr('');
    if (!form.full_name.trim()) return setErr('Full name is required');

    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name.trim(),
        faculty: form.faculty,
        course: form.course.trim(),
        year_of_study: form.academicLevel,
        location: form.location.trim(),
        hometown: form.hometown.trim(),
        residence: form.residence.trim(),
        relationship: form.relationship.trim(),
        birthday: form.birthday.trim(),
        interests: form.interests.trim(),
        avatar_url: avatarUrl,
      }).eq('id', profile.id);

      if (error) throw error;
      await reloadProfile();
      navigation.goBack();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // --- WIZARD STEPS DATA ---
  const steps = [
    { key: 'avatar', label: 'Profile Photo', icon: 'camera-outline', placeholder: '' },
    { key: 'full_name', label: 'What is your full name?', icon: 'person-outline', placeholder: 'e.g. John Doe' },
    { key: 'course', label: 'What course are you taking?', icon: 'book-outline', placeholder: 'e.g. BSc Computer Science' },
    { key: 'faculty', label: 'Which faculty are you in?', icon: 'school-outline', placeholder: 'Select faculty' },
    { key: 'academicLevel', label: 'What is your academic level?', icon: 'calendar-outline', placeholder: 'Select level' },
    { key: 'location', label: 'Where are you currently located?', icon: 'location-outline', placeholder: 'e.g. Laikipia' },
    { key: 'hometown', label: 'What is your hometown?', icon: 'home-outline', placeholder: 'e.g. Kakamega' },
    { key: 'residence', label: 'What is your residence?', icon: 'bed-outline', placeholder: 'e.g. Taili Mbili' },
    { key: 'relationship', label: 'Relationship Status', icon: 'heart-outline', placeholder: 'e.g. Single' },
    { key: 'birthday', label: 'When is your birthday?', icon: 'gift-outline', placeholder: 'e.g. February 3' },
    { key: 'interests', label: 'What are your interests?', icon: 'star-outline', placeholder: 'e.g. Coding, Music' },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const isStepValid = (key: string) => {
    if (key === 'avatar') return true; // Avatar is always optional
    return form[key as keyof typeof form]?.trim().length > 0;
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <View style={styles.container}>
      <TopBar title="Edit Profile" showBack onBack={handleBack} />

      {/* PROGRESS DOTS (Google Style) */}
      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.dot, 
              index === currentStep && styles.dotActive, 
              index < currentStep && styles.dotCompleted
            ]} 
          />
        ))}
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.stepLabel}>STEP {currentStep + 1} OF {steps.length}</Text>
          <Text style={styles.questionTitle}>{currentStepData.label}</Text>

          {err ? <Text style={styles.errorText}>{err}</Text> : null}

          {/* RENDER THE ACTIVE BOX */}
          <View style={styles.activeInputWrapper}>
            
            {/* SPECIAL CASE: AVATAR */}
            {currentStepData.key === 'avatar' ? (
              <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar} activeOpacity={0.8}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={60} color="#4b5563" />
                    </View>
                  )}
                  <View style={styles.cameraIcon}>
                    {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={20} color="#fff" />}
                  </View>
                </TouchableOpacity>
              </View>
            ) : 
            /* SPECIAL CASE: PICKERS (Faculty & Level) */
            (currentStepData.key === 'faculty' || currentStepData.key === 'academicLevel') ? (
              <TouchableOpacity 
                style={styles.hugeInputBox} 
                onPress={() => navigation.navigate(
                  currentStepData.key === 'faculty' ? 'FacultyPicker' : 'AcademicLevelPicker', 
                  { onSelect: (val: string) => setForm({ ...form, [currentStepData.key]: val }) }
                )}
              >
                <Ionicons name={currentStepData.icon as any} size={24} color="#ef4444" style={{ marginRight: 12 }} />
                <Text style={[styles.hugeInputText, { color: form[currentStepData.key as keyof typeof form] ? '#fff' : '#4b5563' }]}>
                  {form[currentStepData.key as keyof typeof form] || currentStepData.placeholder}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#4b5563" />
              </TouchableOpacity>
            ) : 
            /* STANDARD TEXT INPUTS */
            (
              <View style={styles.hugeInputBox}>
                <Ionicons name={currentStepData.icon as any} size={24} color="#ef4444" style={{ marginRight: 12 }} />
                <TextInput
                  style={styles.hugeInputText}
                  placeholder={currentStepData.placeholder}
                  placeholderTextColor="#4b5563"
                  value={form[currentStepData.key as keyof typeof form]}
                  onChangeText={(v) => setForm({ ...form, [currentStepData.key]: v })}
                  autoFocus
                />
              </View>
            )}
          </View>

          {/* NEXT / SAVE BUTTON */}
          <View style={styles.buttonContainer}>
            {isLastStep ? (
              <FastButton style={[styles.mainBtn, { backgroundColor: '#ef4444' }]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>SAVE PROFILE</Text>}
              </FastButton>
            ) : (
              <FastButton 
                style={[styles.mainBtn, { backgroundColor: isStepValid(currentStepData.key) ? '#ef4444' : '#2a2a2a' }]} 
                onPress={handleNext}
                disabled={!isStepValid(currentStepData.key)}
              >
                <Text style={[styles.mainBtnText, { color: isStepValid(currentStepData.key) ? '#fff' : '#6d7382' }]}>CONTINUE</Text>
              </FastButton>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  progressContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1f1f1f' },
  dotActive: { backgroundColor: '#ef4444', width: 20, borderRadius: 4 }, // The active dot stretches
  dotCompleted: { backgroundColor: '#6d7382' },

  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
  
  stepLabel: { color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  questionTitle: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 40 },

  activeInputWrapper: { flex: 1, justifyContent: 'flex-start' },

  hugeInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderBottomWidth: 2, borderBottomColor: '#ef4444', paddingVertical: 16, paddingHorizontal: 4 },
  hugeInputText: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '500', padding: 0 },

  avatarContainer: { alignItems: 'center', marginTop: 20 },
  avatar: { width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: '#ef4444' },
  avatarPlaceholder: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ef4444' },
  cameraIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#ef4444', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#000' },

  buttonContainer: { marginTop: 40 },
  mainBtn: { padding: 18, borderRadius: 12, alignItems: 'center' },
  mainBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginBottom: 10 },
});
