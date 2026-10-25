import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';

async function loadEvents(userId, universityId, faculty, residence) {
  const { data, error } = await supabase
    .from('events')
    .select('*, profiles:organizer_id(id, full_name)')
    .eq('is_published', true)
    .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
    .order('starts_at');
  if (error) throw new Error(error.message);
  
  const events = data || [];
  
  // RANK EVENTS
  const scored = events.map(e => {
    let score = 0;
    if (e.is_official) score += 1000;
    if (residence && e.location?.toLowerCase().includes(residence.toLowerCase())) score += 100;
    if (faculty && e.description?.toLowerCase().includes(faculty.toLowerCase())) score += 80;
    
    const hoursUntil = (new Date(e.starts_at).getTime() - Date.now()) / 3600000;
    if (hoursUntil > 0 && hoursUntil < 24) score += 50;
    else if (hoursUntil < 72) score += 20;
    
    score += Math.floor(Math.random() * 20);
    
    return { ...e, _score: score };
  });
  
  scored.sort((a, b) => b._score - a._score);
  return scored;
}

export default function EventsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '' });
  const [postToFeed, setPostToFeed] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const queryKey = ['events'];
  const eventsQuery = useQuery({ queryKey, enabled: !!profile, staleTime: 60000, queryFn: loadEvents });
  const events = eventsQuery.data || [];
  const loading = eventsQuery.isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    setCoverImage(result.assets[0].uri);
  };

  const uploadCover = async (uri: string) => {
    const ext = uri.split('.').pop() || 'jpg';
    const path = `events/cover-${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('events').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('events').getPublicUrl(path);
    return publicUrl;
  };

  const create = async () => {
    if (!form.title.trim() || !form.starts_at.trim()) return Alert.alert('Missing fields', 'Title and date are required.');

    setUploading(true);
    let imageUrl = null;
    if (coverImage) {
      try { imageUrl = await uploadCover(coverImage); } catch (e: any) { Alert.alert('Upload failed', e.message); }
    }

    const { data: newEvent, error } = await supabase.from('events').insert({
      title: form.title,
      description: form.description,
      location: form.location,
      starts_at: new Date(form.starts_at).toISOString(),
      organizer_id: profile.id,
      is_published: true,
      image_url: imageUrl,
    }).select().single();

    if (error) { setUploading(false); return Alert.alert('Error', error.message); }

    // Post event to the feed if user checked the box
    if (postToFeed && newEvent) {
      await supabase.from('posts').insert({
        author_id: profile.id,
        content: `📅 Event: ${form.title}\n📍 ${form.location}\n\n${form.description}`,
        is_event: true,
        event_id: newEvent.id,
      });
    }

    setUploading(false);
    setCreating(false);
    setForm({ title: '', description: '', location: '', starts_at: '' });
    setCoverImage(null);
    setPostToFeed(false);
    invalidate();
  };

  const rsvp = async (eid: string, status: string) => {
    await supabase.from('event_attendees').upsert({ event_id: eid, user_id: profile.id, status });
    invalidate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        centeredHero
        title="Events"
        subtitle="Discover what is happening on campus"
        showBack={false}
        centerIcon={<Ionicons name="calendar" size={72} color="#ef4444" />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreating(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create Event</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} />
        ) : events.length === 0 ? (
          <Text style={{ color: '#6d7382', textAlign: 'center', padding: 48 }}>No upcoming events</Text>
        ) : (
          events.map((e: any) => (
            <TouchableOpacity key={e.id} style={styles.card} onPress={() => navigation.navigate('EventDetail', { id: e.id })} activeOpacity={0.8}>
              {e.image_url && <Image source={{ uri: e.image_url }} style={styles.coverImg} />}
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>{e.title}</Text>
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={12} /> {new Date(e.starts_at).toLocaleString()}
                </Text>
                {e.location && (
                  <Text style={{ fontSize: 13, color: '#aab0bd', marginTop: 4 }}>
                    <Ionicons name="location-outline" size={12} /> {e.location}
                  </Text>
                )}
                {e.description && (
                  <Text style={{ fontSize: 14, color: '#aab0bd', marginTop: 8, lineHeight: 20 }} numberOfLines={2}>
                    {e.description}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={styles.pillPrimary} onPress={() => rsvp(e.id, 'going')}>
                    <Text style={styles.pillPrimaryText}>Going</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pillGhost} onPress={() => rsvp(e.id, 'interested')}>
                    <Text style={styles.pillGhostText}>Interested</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* CREATE EVENT SHEET */}
      <BottomSheet open={creating} onClose={() => setCreating(false)} maxHeight="95vh">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 }}>Create Event</Text>
          <Text style={{ fontSize: 13, color: '#6d7382', textAlign: 'center', marginBottom: 24 }}>Share what's happening</Text>

          <Text style={styles.label}>Cover image</Text>
          <TouchableOpacity style={styles.coverPicker} onPress={pickCover}>
            {coverImage ? <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} /> : (
              <>
                <Ionicons name="camera" size={28} color="#6d7382" />
                <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 6 }}>Tap to add</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 16 }]}>Event title</Text>
          <TextInput style={styles.input} placeholder="e.g. Hackathon 2026" placeholderTextColor="#6d7382" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />

          <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="What is this event about?" placeholderTextColor="#6d7382" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

          <Text style={[styles.label, { marginTop: 14 }]}>Location</Text>
          <TextInput style={styles.input} placeholder="e.g. Main Hall" placeholderTextColor="#6d7382" value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} />

          <Text style={[styles.label, { marginTop: 14 }]}>Date & Time (YYYY-MM-DD HH:MM)</Text>
          <TextInput style={styles.input} placeholder="2026-11-05 14:00" placeholderTextColor="#6d7382" value={form.starts_at} onChangeText={(v) => setForm({ ...form, starts_at: v })} />

          <TouchableOpacity style={styles.checkRow} onPress={() => setPostToFeed(!postToFeed)}>
            <View style={[styles.checkbox, postToFeed && styles.checkboxActive]}>
              {postToFeed && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={{ color: '#fff', fontSize: 14, marginLeft: 12 }}>Also post this event to the Feed</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryBtn, uploading && { opacity: 0.5 }]} onPress={create} disabled={uploading}>
            <Text style={styles.primaryBtnText}>{uploading ? 'Creating…' : 'Create event'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', borderRadius: 10, padding: 14 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#0a0a0a', borderRadius: 14, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1f1f1f' },
  coverImg: { width: '100%', height: 160 },
  pillPrimary: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pillGhost: { borderWidth: 1, borderColor: '#1f1f1f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillGhostText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', color: '#fff', marginBottom: 8 },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1f1f1f' },
  coverPicker: { height: 140, backgroundColor: '#141414', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#1f1f1f', borderStyle: 'dashed' },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#ef4444', borderWidth: 0 },
});
