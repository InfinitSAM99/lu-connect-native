import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, Switch, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

export default function AppUpdaterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUpload, setCurrentUpload] = useState<FileSystem.UploadTask | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setSettings(data);
      setVersion(data.latest_apk_version || '');
      setForceUpdate(data.force_update || false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' }); // Allow any file for testing
      if (result.canceled) return;
      
      const file = result.assets[0];
      const path = `lu-connect-${Date.now()}.apk`;
      
      setUploading(true);
      setUploadProgress(10); // Fake initial progress

      // 1. Fetch the file locally to get its Blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      setUploadProgress(40); // Fake mid progress

      // 2. Upload using Supabase's standard upload (simplest and most reliable)
      const { error: uploadError } = await supabase.storage
        .from('apks')
        .upload(path, blob, { 
          contentType: 'application/vnd.android.package-archive',
          upsert: true
        });

      if (uploadError) throw uploadError;

      setUploadProgress(90);

      const { data: { publicUrl } } = supabase.storage.from('apks').getPublicUrl(path);
      
      // 3. Save the URL to the database
      await supabase.from('app_settings').update({ latest_apk_url: publicUrl }).eq('id', 1);
      
      setUploadSuccess(true);
      setSettings({ ...settings, latest_apk_url: publicUrl });
      setUploadProgress(100);
      Alert.alert('Success', 'APK uploaded successfully.');
      
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.latest_apk_url) {
      return Alert.alert('Wait', 'Please upload an APK first before publishing.');
    }
    await supabase.from('app_settings').update({
      latest_apk_version: version,
      force_update: forceUpdate,
    }).eq('id', 1);
    Alert.alert('Saved', 'Update settings saved and published.');
    load();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RELEASE UPDATE</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        
        {/* UPLOAD CARD */}
        <View style={styles.card}>
          <Ionicons name="cloud-upload" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Upload New APK</Text>
          <Text style={styles.sub}>Select the .apk file to host.</Text>
          
          {uploading ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={pickAndUpload}>
              <Text style={styles.actionBtnText}>SELECT APK FILE</Text>
            </TouchableOpacity>
          )}

          {settings.latest_apk_url && !uploading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontSize: 12 }}>APK is uploaded and ready.</Text>
            </View>
          )}
        </View>

        {/* SETTINGS CARD */}
        <View style={styles.card}>
          <Text style={styles.label}>Version Number</Text>
          <TextInput
            style={styles.input}
            value={version}
            onChangeText={setVersion}
            placeholder="e.g. 2.0.0"
            placeholderTextColor="#6d7382"
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Force Update</Text>
              <Text style={styles.switchSub}>Blocks all users until they update.</Text>
            </View>
            <Switch
              value={forceUpdate}
              onValueChange={setForceUpdate}
              trackColor={{ false: '#1f1f1f', true: 'rgba(239,68,68,0.5)' }}
              thumbColor={forceUpdate ? '#ef4444' : '#6d7382'}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
            <Text style={styles.saveBtnText}>SAVE & PUBLISH</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  card: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 24, alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  sub: { color: '#6d7382', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  actionBtn: { backgroundColor: '#ef4444', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  
  progressContainer: { width: '100%', alignItems: 'center' },
  progressBarBg: { width: '100%', height: 8, backgroundColor: '#1f1f1f', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: 4 },
  progressText: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  cancelText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  label: { color: '#6d7382', fontSize: 12, fontWeight: '700', marginBottom: 8, alignSelf: 'flex-start' },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, width: '100%', borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 20 },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 24 },
  switchLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchSub: { color: '#6d7382', fontSize: 12, marginTop: 4 },
  
  saveBtn: { backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
