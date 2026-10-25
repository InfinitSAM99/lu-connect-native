import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

const FACULTIES = ['Science', 'Education', 'Business & Economics', 'Arts & Social Sciences', 'Agriculture', 'Health Sciences', 'Law', 'Engineering', 'Other'];
const YEARS = ['1', '2', '3', '4', '5', '6'];

export default function ProfileEditScreen({ navigation, route }: any) {
  const { profile, reloadProfile, setProfile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [form, setForm] = useState({ full_name: '', faculty: '', course: '', year_of_study: '', university_name: '', university_id: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [showFacultyPicker, setShowFacultyPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || '',
      faculty: profile.faculty || '',
      course: profile.course || '',
      year_of_study: profile.year_of_study ? String(profile.year_of_study) : '',
      university_name: profile.university_name || '',
      university_id: profile.university_id || '',
    });
    setAvatarUrl(profile.avatar_url || '');
  }, [profile?.id]);

  useEffect(() => {
    if (route.params?.pickedUniversity) {
      setForm(prev => ({
        ...prev,
        university_name: route.params.pickedUniversity.name,
        university_id: route.params.pickedUniversity.id,
      }));
      navigation.setParams({ pickedUniversity: null });
    }
  }, [route.params?.pickedUniversity]);

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
    if (!form.university_id) return setErr('Please select your university');
    if (!form.faculty) return setErr('Please select your faculty');
    if (!form.course.trim()) return setErr('Please enter your course');
    if (!form.year_of_study) return setErr('Please select your year of study');

    setSaving(true);
    const updates: any = {
      full_name: form.full_name.trim(),
      faculty: form.faculty,
      course: form.course.trim(),
      year_of_study: Number(form.year_of_study),
      university_id: form.university_id,
      avatar_url: avatarUrl,
    };

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
    setSaving(false);
    if (error) return setErr(error.message);
    
    // Instant update
    setProfile({ ...profile, ...updates });
    reloadProfile?.();
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Complete Profile" showBack={true} onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity style={styles.avatarBtn} onPress={pickAvatar} disabled={uploadingAvatar}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={40} color="#6d7382" />}
            <View style={styles.avatarCam}><Ionicons name="camera" size={15} color="#fff" /></View>
          </TouchableOpacity>
        </View>

        {err ? <View style={styles.errBox}><Text style={{ color: '#ef4444', fontSize: 13 }}>{err}</Text></View> : null}

        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} placeholder="Your full name" placeholderTextColor="#6d7382" />

        <Text style={[styles.label, { marginTop: 12 }]}>University</Text>
        <TouchableOpacity 
          style={styles.selectBtn} 
          onPress={() => navigation.navigate('UniversityPicker', { returnTo: 'ProfileEdit' })}
        >
          <Ionicons name="school" size={18} color="#6d7382" style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, color: form.university_name ? '#fff' : '#6d7382', fontSize: 15 }}>{form.university_name || 'Choose your university'}</Text>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 12 }]}>Faculty</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowFacultyPicker(true)}>
          <Text style={{ flex: 1, color: form.faculty ? '#fff' : '#6d7382', fontSize: 15 }}>{form.faculty || 'Select your faculty'}</Text>
          <Ionicons name="chevron-down" size={18} color="#6d7382" />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 12 }]}>Course</Text>
        <TextInput style={styles.input} value={form.course} onChangeText={(v) => setForm({ ...form, course: v })} placeholder="e.g. Bachelor of Education Arts" placeholderTextColor="#6d7382" />

        <Text style={[styles.label, { marginTop: 12 }]}>Year of study</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowYearPicker(true)}>
          <Text style={{ flex: 1, color: form.year_of_study ? '#fff' : '#6d7382', fontSize: 15 }}>{form.year_of_study ? `Year ${form.year_of_study}` : 'Select year'}</Text>
          <Ionicons name="chevron-down" size={18} color="#6d7382" />
        </TouchableOpacity>

        <FastButton style={[styles.saveBtn, (saving || uploadingAvatar) && { opacity: 0.5 }]} onPress={save} disabled={saving || uploadingAvatar}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Save profile</Text>}
        </FastButton>
      </ScrollView>

      {showFacultyPicker && (
        <View style={StyleSheet.absoluteFill}>
           <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 100, backgroundColor: '#000' }}>
             <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 16 }}>Select Faculty</Text>
             {FACULTIES.map(f => (
               <TouchableOpacity key={f} style={styles.pickerItem} onPress={() => { setForm({ ...form, faculty: f }); setShowFacultyPicker(false); }}>
                 <Text style={{ color: '#fff', fontSize: 15 }}>{f}</Text>
               </TouchableOpacity>
             ))}
           </ScrollView>
        </View>
      )}

      {showYearPicker && (
        <View style={StyleSheet.absoluteFill}>
           <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 100, backgroundColor: '#000' }}>
             <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 16 }}>Select Year</Text>
             {YEARS.map(y => (
               <TouchableOpacity key={y} style={styles.pickerItem} onPress={() => { setForm({ ...form, year_of_study: y }); setShowYearPicker(false); }}>
                 <Text style={{ color: '#fff', fontSize: 15 }}>Year {y}</Text>
               </TouchableOpacity>
             ))}
           </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errBox: { backgroundColor: 'rgba(239,68,68,0.14)', padding: 12, borderRadius: 12, marginBottom: 16 },
  avatarBtn: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarCam: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  label: { fontSize: 12, fontWeight: '500', color: '#6d7382', marginBottom: 6 },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 12, padding: 14 },
  saveBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  pickerItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
});
