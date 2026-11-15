import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ForceDetailsModal() {
  const { profile, reloadProfile } = useAuth();
  const [faculty, setFaculty] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);

  // Bulletproof check
  const isMissing = (val: any) => !val || String(val).trim() === '';
  
  const needsDetails = profile && profile.approval_status === 'approved' && 
    (isMissing(profile.faculty) || isMissing(profile.course) || isMissing(profile.year_of_study));

  // If they don't need it, or they are not logged in, hide.
  if (!needsDetails || !profile) return null;

  const handleSave = async () => {
    if (!faculty.trim() || !course.trim() || !year.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      faculty: faculty.trim(),
      course: course.trim(),
      year_of_study: year.trim(),
    }).eq('id', profile.id);

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await reloadProfile();
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Ionicons name="school" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>COMPLETE YOUR PROFILE</Text>
          <Text style={styles.sub}>You must fill in your academic details to continue using LU Connect.</Text>

          <Text style={styles.label}>Faculty / School</Text>
          <TextInput style={styles.input} placeholder="e.g. School of Computing" placeholderTextColor="#6d7382" value={faculty} onChangeText={setFaculty} />

          <Text style={styles.label}>Course</Text>
          <TextInput style={styles.input} placeholder="e.g. BSc Computer Science" placeholderTextColor="#6d7382" value={course} onChangeText={setCourse} />

          <Text style={styles.label}>Year of Study</Text>
          <TextInput style={styles.input} placeholder="e.g. 3" placeholderTextColor="#6d7382" keyboardType="numeric" maxLength={1} value={year} onChangeText={setYear} />

          <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SAVE AND CONTINUE</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#0a0a0a', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1f1f1f' },
  title: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  sub: { color: '#6d7382', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  label: { color: '#6d7382', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#000', color: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 14, fontSize: 15 },
  btn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
