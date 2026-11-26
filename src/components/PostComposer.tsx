import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../lib/ai';

const { width: SCREEN_W } = Dimensions.get('window');

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
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(initialAnonymous);
  const [mediaType, setMediaType] = useState('Photos/Videos');

  const MAX_IMAGES = 5;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri }))].slice(0, MAX_IMAGES));
      setMediaType('Photos/Videos');
    }
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!profile) return;
    if (images.length === 0 && !content.trim()) return Alert.alert('Empty', 'Add a photo or write something.');
    if (uploading) return;

    setUploading(true);
    try {
      const { data: post, error } = await supabase.from('posts').insert({ 
        author_id: profile.id, 
        content: content.trim(), 
        university_id: profile.university_id, 
        is_anonymous: isAnonymous 
      }).select().single();
      if (error) throw error;

      onPosted?.();
      
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

      onPosted?.();
      if (content.trim()) moderatePost({ content: content.trim(), postId: post.id, authorId: profile.id });

      setContent(''); setImages([]); setIsAnonymous(initialAnonymous);
      if (typeof onClose === 'function') onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      
      {/* HEADER */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Create Post</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} keyboardShouldPersistTaps="handled">
        
        {/* AUTHOR INFO */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
          <Image source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'U'}` }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          <View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{profile?.full_name}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <View style={{ backgroundColor: '#1f1f1f', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Public</Text>
              </View>
              <View style={{ backgroundColor: '#1f1f1f', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>AI</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TEXT AREA */}
        <TextInput
          style={styles.textarea}
          placeholder="What's on your mind?"
          placeholderTextColor="#4b5563"
          multiline
          autoFocus
          value={content}
          onChangeText={setContent}
          editable={!uploading}
        />

        {/* PREMIUM IMAGE GRID (Facebook Style) */}
        {images.length > 0 && (
          <View style={styles.imageGrid}>
            {images.map((img, i) => (
              <View key={i} style={[
                styles.gridItem, 
                images.length === 1 ? { width: '100%', height: 250 } : 
                images.length === 2 ? { width: '48%', height: 200 } : 
                { width: '31%', height: 120 }
              ]}>
                <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {!uploading && (
                  <TouchableOpacity onPress={() => removeImage(i)} style={styles.removeBtn}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ACTION ROWS */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <ActionRow icon="images" label={mediaType} color="#22c55e" onPress={pickImage} />
          <ActionRow icon="musical-notes" label="Music" color="#ec4899" onPress={() => alert('Music picker coming soon!')} />
          <ActionRow icon="person-add" label="Tag people" color="#3b82f6" onPress={() => alert('Tag friends coming soon!')} />
          <ActionRow icon="location" label="Add location" color="#ef4444" onPress={() => alert('Location picker coming soon!')} />
          <ActionRow icon="happy" label="Feeling/activity" color="#f59e0b" onPress={() => alert('Feeling picker coming soon!')} />

          {/* ANONYMOUS TOGGLE */}
          <TouchableOpacity
            style={[styles.anonRow, isAnonymous && { borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)' }]}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <Ionicons name={isAnonymous ? 'eye-off' : 'eye-off-outline'} size={24} color={isAnonymous ? '#a855f7' : '#6d7382'} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: isAnonymous ? '#a855f7' : '#fff', fontSize: 15, fontWeight: '600' }}>Post Anonymously</Text>
              <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>Your name will be hidden from the feed</Text>
            </View>
            <View style={[styles.checkbox, isAnonymous && { backgroundColor: '#a855f7', borderColor: '#a855f7' }]}>
              {isAnonymous && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FLOATING POST BUTTON (At the bottom) */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.postBtn, (uploading || (!content.trim() && images.length === 0)) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={uploading || (!content.trim() && images.length === 0)}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  textarea: { paddingHorizontal: 16, color: '#fff', fontSize: 20, lineHeight: 28, minHeight: 120, textAlignVertical: 'top' },
  
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  gridItem: { borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#141414' },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  actionLabel: { color: '#fff', fontSize: 15, fontWeight: '500', marginLeft: 16 },

  anonRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', backgroundColor: '#0a0a0a' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#4b5563', alignItems: 'center', justifyContent: 'center' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  postBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, // Blue button like Facebook
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
