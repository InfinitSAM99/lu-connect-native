import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function UploadReelScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [title, setTitle] = useState('');
  const [video, setVideo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setVideo(result.assets[0]);
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!video || !title.trim()) {
      setErrorMsg('Please add a caption and select a video.');
      return;
    }
    setUploading(true);
    setProgress(0);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const base64 = await FileSystem.readAsStringAsync(video.uri, { encoding: FileSystem.EncodingType.Base64 });
      const ext = video.uri.split('.').pop() || 'mp4';
      const path = `${profile.id}/reel-${Date.now()}.${ext}`;
      
      // Simulate progress start
      setProgress(20);

      const { error: upErr } = await supabase.storage.from('reels').upload(path, decode(base64), { contentType: 'video/mp4' });
      if (upErr) throw upErr;
      
      setProgress(70);

      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(path);

      const { error: dbErr } = await supabase.from('reels').insert({
        user_id: profile.id,
        video_url: publicUrl,
        caption: title.trim(),
      });
      if (dbErr) throw dbErr;

      setProgress(100);
      setSuccessMsg('Reel posted successfully!');
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (e: any) {
      setErrorMsg(e.message || 'Upload failed.');
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW REEL</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <TouchableOpacity style={styles.videoBox} onPress={pickVideo} disabled={uploading}>
          {video ? (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
              <Text style={{ color: '#22c55e', marginTop: 12, fontWeight: '700', fontSize: 16 }}>Video Ready</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="videocam" size={64} color="#ef4444" />
              <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700', fontSize: 16 }}>Tap to select video</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Write a caption..."
          placeholderTextColor="#6d7382"
          value={title}
          onChangeText={setTitle}
          multiline
          editable={!uploading}
        />

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        {successMsg && <Text style={styles.successText}>{successMsg}</Text>}

        {uploading ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}% Uploading...</Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.btn, (!video || !title.trim()) && { opacity: 0.5 }]} onPress={handleUpload} disabled={!video || !title.trim()}>
            <Text style={styles.btnText}>POST REEL</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  videoBox: { height: width * 1.2, backgroundColor: '#0a0a0a', borderRadius: 24, borderWidth: 2, borderColor: '#1f1f1f', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  input: { backgroundColor: '#141414', borderRadius: 16, padding: 20, color: '#fff', fontSize: 16, height: 120, textAlignVertical: 'top', marginBottom: 24 },
  btn: { backgroundColor: '#ef4444', padding: 20, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  successText: { color: '#22c55e', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  progressWrap: { marginTop: 10 },
  progressBg: { height: 8, backgroundColor: '#1f1f1f', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: 4 },
  progressText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
