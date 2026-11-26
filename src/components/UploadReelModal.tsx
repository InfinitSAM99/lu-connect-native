import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function UploadReelModal({ visible, onClose, onUploaded }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [caption, setCaption] = useState('');
  const [video, setVideo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
      videoMaxDuration: 60, // Match the trimmer logic
    });
    if (!result.canceled) setVideo(result.assets[0]);
  };

  const handleUpload = async () => {
    if (!video || !profile?.id) return Alert.alert('Error', 'Please select a video.');
    setUploading(true);

    try {
      // 1. Fetch the file
      const response = await fetch(video.uri);
      const blob = await response.blob();

      // 2. Upload to Supabase Storage 'reels' bucket
      const ext = video.uri.split('.').pop() || 'mp4';
      const path = `${profile.id}/reel-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('reels').upload(path, blob, {
        contentType: 'video/mp4',
      });
      if (upErr) throw upErr;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(path);

      // 4. Insert into 'reels' Database
      const { error: dbErr } = await supabase.from('reels').insert({
        user_id: profile.id,           // Make sure your DB uses user_id for reels
        video_url: publicUrl,
        caption: caption.trim(),
        university_id: profile.university_id,
      });
      if (dbErr) throw dbErr;

      Alert.alert('Success', 'Reel uploaded successfully!');
      setCaption(''); setVideo(null);
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
            <Text style={styles.headerTitle}>UPLOAD REEL</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            <TouchableOpacity style={styles.videoPicker} onPress={pickVideo}>
              {video ? (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                  <Text style={{ color: '#22c55e', marginTop: 8, fontWeight: '700' }}>Video Selected</Text>
                  <Text style={{ color: '#6d7382', marginTop: 4, fontSize: 11 }}>{(video.duration / 1000).toFixed(1)}s</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="videocam" size={48} color="#ef4444" />
                  <Text style={{ color: '#fff', marginTop: 8, fontWeight: '700' }}>Tap to select video</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Write a caption..."
              placeholderTextColor="#6d7382"
              value={caption}
              onChangeText={setCaption}
              multiline
            />

            <TouchableOpacity style={[styles.btn, !video && { opacity: 0.5 }]} onPress={handleUpload} disabled={!video || uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>UPLOAD REEL</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  videoPicker: { height: 180, backgroundColor: '#141414', borderRadius: 16, borderWidth: 2, borderColor: '#1f1f1f', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, marginBottom: 20, minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
