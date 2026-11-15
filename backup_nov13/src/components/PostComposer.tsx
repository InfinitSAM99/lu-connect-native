import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import FastButton from './FastButton';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../lib/ai';

async function moderatePost({ content, postId, authorId }: any) {
  if (!content || !content.trim()) return;
  try {
    const { reply } = await askAI({ mode: 'moderate', messages: [{ role: 'user', content: content.trim() }] });
    if (!reply) return;
    let parsed;
    try { parsed = JSON.parse(reply); } catch { return; }
    if (!parsed.flagged) return;
    await supabase.from('moderation_flags').insert({
      content_type: 'post', content_id: postId, author_id: authorId,
      content_preview: content.trim().slice(0, 300),
      ai_category: parsed.category || 'other', ai_confidence: parsed.confidence || 0,
      ai_reason: parsed.reason || '', status: 'pending',
    });
  } catch (e) { console.warn('moderation failed:', e); }
}

export default function PostComposer({ onPosted, onClose, initialAnonymous = false }: any) {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(initialAnonymous);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.7,
    });
    if (!result.canceled) setImages(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri }))].slice(0, 4));
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission denied', 'Camera access is required.');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setImages(prev => [...prev, { uri: result.assets[0].uri }].slice(0, 4));
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!profile) return;
    if (images.length === 0 && !content.trim()) return Alert.alert('Empty', 'Add a photo or write something.');
    if (uploading) return;

    setUploading(true);
    try {
      // 1. Insert post FIRST (text appears immediately)
      const { data: post, error } = await supabase.from('posts').insert({ author_id: profile.id, content: content.trim(), university_id: profile.university_id, is_anonymous: isAnonymous }).select().single();
      if (error) throw error;

      // 2. Notify feed immediately (post without images appears)
      onPosted?.();
      setUploading(false);

      // 3. Upload images in the background (no blocking UI)
      const imagePromises = images.map(async (img, i) => {
        try {
          const ext = img.uri.split('.').pop() || 'jpg';
          const path = `${profile.id}/${post.id}-${Date.now()}-${i}.${ext}`;
          const response = await fetch(img.uri);
          const blob = await response.blob();
          const { error: upErr } = await supabase.storage.from('posts').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (upErr) return;
          const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path);
          await supabase.from('post_media').insert({ post_id: post.id, media_url: publicUrl, media_type: 'image', sort_order: i });
        } catch (e) { console.warn('image upload failed:', e); }
      });
      await Promise.allSettled(imagePromises);

      // 4. Notify feed again so images slide in
      onPosted?.();

      // 5. AI moderation (non-blocking)
      if (content.trim()) moderatePost({ content: content.trim(), postId: post.id, authorId: profile.id });

      setContent(''); setImages([]); setIsAnonymous(initialAnonymous);
      if (typeof onClose === 'function') onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HERO */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
        <Ionicons name="create" size={56} color="#ef4444" />
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 8 }}>New Post</Text>
        <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 4 }}>Share something with your campus</Text>
      </View>

      <View style={styles.composerBox}>
        <Image source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'U'}` }} style={styles.avatar} />
        <TextInput
          style={styles.textarea}
          placeholder="What's on your mind?"
          placeholderTextColor="#6d7382"
          multiline
          autoFocus
          value={content}
          onChangeText={setContent}
          editable={!uploading}
        />
      </View>

      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
          {images.map((img, i) => (
            <View key={i} style={{ position: 'relative' }}>
              <Image source={{ uri: img.uri }} style={styles.preview} />
              {!uploading && (
                <TouchableOpacity onPress={() => removeImage(i)} style={styles.removeBtn}>
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Anonymous Toggle */}
      <FastButton
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingVertical: 10, paddingHorizontal: 12,
          marginTop: 12, borderRadius: 12,
          backgroundColor: isAnonymous ? 'rgba(168,85,247,0.15)' : '#141414',
          borderWidth: 1, borderColor: isAnonymous ? '#a855f7' : '#1f1f1f',
        }}
        onPress={() => setIsAnonymous(!isAnonymous)}
      >
        <Ionicons
          name={isAnonymous ? 'eye-off' : 'eye-off-outline'}
          size={20}
          color={isAnonymous ? '#a855f7' : '#6d7382'}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: isAnonymous ? '#a855f7' : '#fff' }}>
            Post Anonymously
          </Text>
          <Text style={{ fontSize: 11, color: '#6d7382', marginTop: 2 }}>
            Your name will be hidden — perfect for confessions
          </Text>
        </View>
        <View style={{
          width: 22, height: 22, borderRadius: 6,
          borderWidth: 2, borderColor: isAnonymous ? '#a855f7' : '#6d7382',
          backgroundColor: isAnonymous ? '#a855f7' : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {isAnonymous && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </FastButton>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={takePhoto} style={styles.mediaBtn} disabled={uploading || images.length >= 4}>
          <Ionicons name="camera-outline" size={22} color="#fff" />
          <Text style={styles.mediaBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage} style={styles.mediaBtn} disabled={uploading || images.length >= 4}>
          <Ionicons name="image-outline" size={22} color="#fff" />
          <Text style={styles.mediaBtnText}>Gallery</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.postBtn, (uploading || (!content.trim() && images.length === 0)) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={uploading || (!content.trim() && images.length === 0)}
        >
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.postBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  composerBox: { flexDirection: 'row', gap: 12, marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  textarea: { flex: 1, backgroundColor: '#141414', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#1f1f1f' },
  preview: { width: 90, height: 90, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#141414', borderRadius: 20 },
  mediaBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  postBtn: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, minWidth: 90, alignItems: 'center' },
  postBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
