import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AcademicUploadModal({ visible, onClose, onUploaded }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<any>(null);
  const [type, setType] = useState<'pdf' | 'image' | 'audio'>('pdf');
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const pickFile = async (selectedType: 'pdf' | 'image' | 'audio') => {
    setType(selectedType);
    try {
      if (selectedType === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (!result.canceled) setFile(result.assets[0]);
      } else {
        const mime = selectedType === 'pdf' ? 'application/pdf' : 'audio/*';
        const result = await DocumentPicker.getDocumentAsync({ type: mime });
        if (!result.canceled) setFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick file.');
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) return Alert.alert('Error', 'Title and file are required');
    setUploading(true);

    try {
      const fileExt = file.name ? file.name.split('.').pop() : type === 'image' ? 'jpg' : 'mp4';
      const path = `${profile.id}/${Date.now()}.${fileExt}`;
      
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const { error: upErr } = await supabase.storage.from('academic-files').upload(path, blob, {
        contentType: file.mimeType || (type === 'pdf' ? 'application/pdf' : type === 'image' ? 'image/jpeg' : 'video/mp4'),
      });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('academic-files').getPublicUrl(path);



      const { error: dbErr } = await supabase.from('academic_posts').insert({
        author_id: profile.id,
        university_id: profile.university_id,
        university_name: profile.university_name,
        faculty: profile.faculty,
        course: profile.course,
        year_of_study: profile.year_of_study,
        title: title.trim(),
        description: desc.trim(),
        media_url: publicUrl,
        media_type: type,
        file_name: file.name || `${title}.${fileExt}`,
      });
      if (dbErr) throw dbErr;

      Alert.alert('Success', 'Material uploaded successfully!');
      setTitle(''); setDesc(''); setFile(null); setCoverUrl(null);
      onUploaded();
      onClose();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>UPLOAD MATERIAL</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>TITLE</Text>
            <TextInput style={styles.input} placeholder="e.g. Data Structures CAT 1" placeholderTextColor="#6d7382" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Add any notes..." placeholderTextColor="#6d7382" multiline value={desc} onChangeText={setDesc} />

            <Text style={styles.label}>SELECT TYPE</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {['pdf', 'image', 'audio'].map((t) => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]} 
                  onPress={() => pickFile(t as any)}
                >
                  <Ionicons 
                    name={t === 'pdf' ? 'document-text' : t === 'image' ? 'image' : 'musical-notes'} 
                    size={18} 
                    color={type === t ? '#fff' : '#6d7382'} 
                  />
                  <Text style={[styles.typeText, type === t && { color: '#fff' }]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {file && (
              <View style={styles.filePreview}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.fileName} numberOfLines={1}>{file.name || 'Selected file'}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, !file && { opacity: 0.5 }]} onPress={handleUpload} disabled={!file || uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>UPLOAD TO HUB</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  label: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#1f1f1f' },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#141414', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  typeBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  typeText: { color: '#6d7382', fontSize: 12, fontWeight: '700' },
  filePreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.1)', padding: 12, borderRadius: 8 },
  fileName: { color: '#22c55e', fontSize: 13, fontWeight: '600', flex: 1 },
  saveBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
