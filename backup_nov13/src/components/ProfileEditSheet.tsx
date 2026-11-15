import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomSheet from './BottomSheet';
import FastButton from './FastButton';

const FACULTIES = ['Science', 'Education', 'Business & Economics', 'Arts & Social Sciences', 'Agriculture', 'Health Sciences', 'Law', 'Engineering', 'Other'];
const YEARS = ['1', '2', '3', '4', '5', '6'];

export default function ProfileEditSheet({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { profile, reloadProfile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  
  const [form, setForm] = useState({ full_name: '', username: '', faculty: '', course: '', year_of_study: '', university_name: '', university_id: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  
  const [showFacultyPicker, setShowFacultyPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Handle the return from the UniversityPicker
  useEffect(() => {
    if (route.params?.selectedUniversity) {
      setForm(prev => ({ 
        ...prev, 
        university_name: route.params.selectedUniversity.name, 
        university_id: route.params.selectedUniversity.id 
      }));
      // Clear the param so it doesn't re-apply
      navigation.setParams({ selectedUniversity: undefined });
    }
  }, [route.params?.selectedUniversity]);

  useEffect(() => {
    if (!open || !profile) return;
    setForm({
      full_name: profile.full_name || '',
      username: profile.username || '',
      faculty: profile.faculty || '',
      course: profile.course || '',
      year_of_study: profile.year_of_study ? String(profile.year_of_study) : '',
      university_name: profile.university_name || '',
      university_id: profile.university_id || '',
    });
    setAvatarUrl(profile.avatar_url || '');
    setErr('');
  }, [open, profile?.id]);

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
    } finally {
      setUploadingAvatar(false);
    }
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
    await reloadProfile?.();
    onClose?.();
  };

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="92vh">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 }}>Complete your profile</Text>
        <Text style={{ fontSize: 13, color: '#6d7382', textAlign: 'center', marginBottom: 24 }}>Fill in your details to keep using LU CONNECT</Text>

        {err ? <View style={styles.errBox}><Text style={{ color: '#ef4444', fontSize: 13 }}>{err}</Text></View> : null}

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity style={styles.avatarBtn} onPress={pickAvatar} disabled={uploadingAvatar}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={40} color="#6d7382" />}
            <View style={styles.avatarCam}><Ionicons name="camera" size={15} color="#fff" /></View>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} placeholder="Your full name" placeholderTextColor="#6d7382" />

        <Text style={[styles.label, { marginTop: 12 }]}>University</Text>
        <FastButton 
          style={styles.selectBtn} 
          onPress={() => {
            // Close the sheet, navigate to picker, then reopen the sheet on return
            onClose(); 
            navigation.navigate('UniversityPicker', { 
              returnTo: 'ProfileEditSheet',
              onSelect: (name: string, id: string) => {
                 // Set the value directly if onSelect is called
                 setForm(prev => ({ ...prev, university_name: name, university_id: id }));
              }
            });
          }}
        >
          <Ionicons name="school" size={18} color="#6d7382" style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, color: form.university_name ? '#fff' : '#6d7382', fontSize: 15 }}>{form.university_name || 'Choose your university'}</Text>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </FastButton>

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

      <BottomSheet open={showFacultyPicker} onClose={() => setShowFacultyPicker(false)} maxHeight="60vh">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 16 }}>Select Faculty</Text>
          {FACULTIES.map(f => (
            <TouchableOpacity key={f} style={styles.pickerItem} onPress={() => { setForm({ ...form, faculty: f }); setShowFacultyPicker(false); }}>
              <Text style={{ color: '#fff', fontSize: 15 }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet open={showYearPicker} onClose={() => setShowYearPicker(false)} maxHeight="60vh">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 16 }}>Select Year</Text>
          {YEARS.map(y => (
            <TouchableOpacity key={y} style={styles.pickerItem} onPress={() => { setForm({ ...form, year_of_study: y }); setShowYearPicker(false); }}>
              <Text style={{ color: '#fff', fontSize: 15 }}>Year {y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </BottomSheet>
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
