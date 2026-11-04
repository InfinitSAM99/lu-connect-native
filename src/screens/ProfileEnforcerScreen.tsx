import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import UniversityPickerScreen from './UniversityPickerScreen';

export default function ProfileEnforcerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, setProfile, reloadProfile, signOut } = useAuth();
  
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [faculty, setFaculty] = useState(profile?.faculty || '');
  const [course, setCourse] = useState(profile?.course || '');
  const [academicLevel, setAcademicLevel] = useState(profile?.year_of_study || '');
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUniModal, setShowUniModal] = useState(false);
  const [err, setErr] = useState('');

  const pickAvatar = async () => {
    if (!profile?.id) {
      setErr('Profile is still loading. Please wait a moment.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled) return;
    setUploading(true);
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
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!profile?.id) return setErr('Profile is still loading. Please wait.');
    if (!avatarUrl) return setErr('Profile picture is required.');
    if (!profile?.university_id) return setErr('Please select your university.');
    if (!faculty) return setErr('Please select your faculty.');
    if (!course.trim()) return setErr('Please enter your course.');
    if (!academicLevel) return setErr('Please select your academic level.');

    setSaving(true);
    setErr('');

    const { error } = await supabase.from('profiles').update({
      avatar_url: avatarUrl,
      faculty,
      course: course.trim(),
      year_of_study: academicLevel,
    }).eq('id', profile.id);

    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      // Force update the local state immediately
      setProfile((prev: any) => ({
        ...prev,
        avatar_url: avatarUrl,
        faculty,
        course: course.trim(),
        year_of_study: academicLevel,
      }));
      // Then do a silent background reload to sync everything else
      reloadProfile();
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}>
        
        {/* LU PREMIUM HERO */}
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Text style={styles.logoTextLU}>LU</Text>
          </View>
          <Text style={styles.logoTextConnect}>LU CONNECT</Text>
        </View>
        <View style={styles.divider} />

        <Text style={styles.title}>COMPLETE YOUR PROFILE</Text>
        <Text style={styles.subtitle}>
          To join the LU Connect community, you need a profile photo and your academic details. This ensures a safe, verified campus network.
        </Text>

        {err ? <Text style={styles.errorText}>{err}</Text> : null}

        {/* AVATAR SECTION */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploading} style={styles.avatarTap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={32} color="#ef4444" />
              </View>
            )}
            {uploading && <ActivityIndicator style={StyleSheet.absoluteFill} color="#ef4444" />}
          </TouchableOpacity>
          <Text style={styles.avatarLabel}>Tap to add profile picture</Text>
        </View>

        {/* FORM FIELDS */}
        <View style={styles.formWrap}>
          
          {/* University (Tappable) */}
          <Text style={styles.label}>University</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => setShowUniModal(true)}>
            <Ionicons name="business-outline" size={20} color="#6d7382" style={{ marginRight: 12 }} />
            <Text style={[styles.inputText, { color: profile?.university_name ? '#fff' : '#6d7382' }]}>
              {profile?.university_name || 'Select university'}
            </Text>
          </TouchableOpacity>

          {/* Faculty */}
          <Text style={styles.label}>Faculty / School</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => navigation.navigate('FacultyPicker', { onSelect: (f: string) => setFaculty(f) })}>
            <Ionicons name="school-outline" size={20} color="#6d7382" style={{ marginRight: 12 }} />
            <Text style={[styles.inputText, { color: faculty ? '#fff' : '#6d7382' }]}>{faculty || 'Select faculty'}</Text>
          </TouchableOpacity>

          {/* Course */}
          <Text style={styles.label}>Course</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="book-outline" size={20} color="#6d7382" style={{ marginRight: 12 }} />
            <TextInput
              style={styles.inputText}
              placeholder="e.g. BSc Computer Science"
              placeholderTextColor="#6d7382"
              value={course}
              onChangeText={setCourse}
            />
          </View>

          {/* Academic Level */}
          <Text style={styles.label}>Academic Level</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => navigation.navigate('AcademicLevelPicker', { onSelect: (l: string) => setAcademicLevel(l) })}>
            <Ionicons name="calendar-outline" size={20} color="#6d7382" style={{ marginRight: 12 }} />
            <Text style={[styles.inputText, { color: academicLevel ? '#fff' : '#6d7382' }]}>{academicLevel || 'Select academic level'}</Text>
          </TouchableOpacity>

        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>SAVE AND ENTER</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => signOut()} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: '#6d7382', fontSize: 13, fontWeight: '600' }}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
          <Modal visible={showUniModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowUniModal(false)}>
        <UniversityPickerScreen 
          onSelect={(item: any) => { 
            setProfile((prev: any) => ({ ...prev, university_id: item.id, university_name: item.name })); 
            setShowUniModal(false); 
          }} 
          onClose={() => setShowUniModal(false)} 
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  
  hero: { alignItems: 'center', marginBottom: 16 },
  logoBox: { width: 80, height: 80, borderRadius: 22, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginBottom: 24 },

  title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center', marginBottom: 10 },
  subtitle: { color: '#6d7382', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  errorText: { color: '#ef4444', textAlign: 'center', fontSize: 13, fontWeight: '600', marginBottom: 10 },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarTap: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#ef4444', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.05)' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarLabel: { color: '#ef4444', fontSize: 12, marginTop: 10, fontWeight: '700' },

  formWrap: { marginTop: 10 },
  label: { color: '#6d7382', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 16, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', paddingHorizontal: 14 },
  inputText: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  
  primaryBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
