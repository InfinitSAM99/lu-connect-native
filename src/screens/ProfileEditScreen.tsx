import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
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

  const renderInput = (label: string, key: keyof typeof form, placeholder: string, icon: string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon as any} size={20} color="#6d7382" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#6d7382"
          value={form[key]}
          onChangeText={(v) => setForm({ ...form, [key]: v })}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopBar title="Edit Profile" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        {/* AVATAR */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#6d7382" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </View>

        {err ? <Text style={styles.errorText}>{err}</Text> : null}

        {/* BASIC INFO */}
        <Text style={styles.sectionHeader}>BASIC INFO</Text>
        {renderInput('Full Name', 'full_name', 'Your full name', 'person-outline')}
        {renderInput('Course', 'course', 'e.g. BSc Computer Science', 'book-outline')}

        {/* ACADEMIC */}
        <Text style={styles.sectionHeader}>ACADEMIC DETAILS</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Faculty</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => navigation.navigate('FacultyPicker', { onSelect: (f: string) => setForm({ ...form, faculty: f }) })}>
            <Ionicons name="school-outline" size={20} color="#6d7382" style={{ marginRight: 10 }} />
            <Text style={[styles.input, { color: form.faculty ? '#fff' : '#6d7382' }]}>{form.faculty || 'Select faculty'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Academic Level</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => navigation.navigate('AcademicLevelPicker', { onSelect: (l: string) => setForm({ ...form, academicLevel: l }) })}>
            <Ionicons name="calendar-outline" size={20} color="#6d7382" style={{ marginRight: 10 }} />
            <Text style={[styles.input, { color: form.academicLevel ? '#fff' : '#6d7382' }]}>{form.academicLevel || 'Select academic level'}</Text>
          </TouchableOpacity>
        </View>

        {/* ADDITIONAL DETAILS */}
        <Text style={styles.sectionHeader}>ADDITIONAL DETAILS</Text>
        {renderInput('Location', 'location', 'e.g. Laikipia', 'location-outline')}
        {renderInput('Hometown', 'hometown', 'e.g. Kakamega', 'home-outline')}
        {renderInput('Residence', 'residence', 'e.g. Taili Mbili', 'bed-outline')}
        {renderInput('Relationship Status', 'relationship', 'e.g. Single, In a relationship', 'heart-outline')}
        {renderInput('Birthday', 'birthday', 'e.g. February 3', 'gift-outline')}
        {renderInput('Interests', 'interests', 'e.g. Coding, Music, Sports', 'star-outline')}

        <FastButton style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
        </FastButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#ef4444' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ef4444' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#ef4444', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  changePhotoText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginTop: 8 },
  
  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 24, marginBottom: 12 },
  
  inputGroup: { marginBottom: 16 },
  label: { color: '#6d7382', fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', paddingHorizontal: 14 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  
  saveBtn: { backgroundColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 10, fontSize: 13 },
});
