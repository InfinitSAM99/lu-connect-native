import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function UploadReelModal({ open, onClose, onUploaded }: any) {
  const { profile } = useAuth();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
  });

  React.useEffect(() => {
    if (open && videoUri) {
      player.replace(videoUri);
      player.play();
    } else {
      player.pause();
    }
  }, [open, videoUri, player]);

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
      videoMaxDuration: 60, // WhatsApp-style limit — the OS auto-opens trimmer for >60s
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    setVideoUri(asset.uri);
    setDuration(asset.duration || 0);
  };

  const reset = () => {
    setVideoUri(null);
    setCaption('');
    setDuration(0);
  };

  const upload = async () => {
    if (!videoUri || !profile) return;
    setUploading(true);
    try {
      const ext = videoUri.split('.').pop() || 'mp4';
      const path = `reels/${profile.id}-${Date.now()}.${ext}`;
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from('reels').upload(path, blob, { contentType: 'video/mp4' });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(path);

      const { data: newPost, error: postErr } = await supabase.from('posts').insert({
        author_id: profile.id,
        content: caption.trim() || '',
        university_id: profile.university_id,
      }).select().single();
      if (postErr) throw postErr;

      // Save the video URL to post_media
      const { error: mediaErr } = await supabase.from('post_media').insert({
        post_id: newPost.id,
        media_url: publicUrl,
        media_type: 'video',
        sort_order: 0,
      });
      if (mediaErr) throw mediaErr;

      reset();
      onUploaded?.();
      onClose();
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Upload Reel</Text>
          <View style={{ width: 26 }} />
        </View>

        <TouchableOpacity onPress={pickVideo} style={{ height: 320, borderRadius: 16, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' }}>
          {videoUri ? (
            <>
              <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
              <TouchableOpacity onPress={() => setVideoUri(null)} style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 8 }}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{(duration / 1000).toFixed(1)}s</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="videocam" size={60} color="#6d7382" />
              <Text style={{ color: '#6d7382', marginTop: 12 }}>Tap to select a video</Text>
              <Text style={{ color: '#6d7382', marginTop: 4, fontSize: 12 }}>Videos longer than 60s will open the trimmer</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity onPress={pickVideo} style={{ flex: 1, backgroundColor: '#141414', borderRadius: 12, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="cut" size={16} color="#ef4444" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Trim / Replace</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#141414', borderRadius: 12, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: 0.5 }}>
            <Ionicons name="color-filter" size={16} color="#ef4444" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Filters (soon)</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>CAPTION</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Say something about this reel..."
          placeholderTextColor="#6d7382"
          style={{ backgroundColor: '#141414', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, minHeight: 100, textAlignVertical: 'top' }}
          multiline
        />

        <TouchableOpacity
          onPress={upload}
          disabled={!videoUri || uploading}
          style={{ backgroundColor: videoUri ? '#ef4444' : '#1a1a1a', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 }}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Post Reel</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
