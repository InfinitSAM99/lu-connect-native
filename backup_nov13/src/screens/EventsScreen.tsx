import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

function safeParseDate(input: string): Date {
  const trimmed = (input || '').trim();
  const d1 = new Date(trimmed);
  if (!isNaN(d1.getTime())) return d1;
  const parts = trimmed.split(/[^0-9]/).filter(Boolean);
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date();
}

async function loadEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
    .order('starts_at');
  if (error) throw error;
  return data || [];
}

export default function EventsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '' });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [postToFeed, setPostToFeed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: loadEvents,
    staleTime: 30000,
  });

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
    if (!form.title.trim() || !form.starts_at.trim()) {
      return Alert.alert('Missing fields', 'Title and date are required.');
    }

    setUploading(true);
    try {
      // Force fresh session
      await supabase.auth.getSession();

      let imageUrl = null;
      if (coverImage) {
        imageUrl = await uploadCover(coverImage);
      }

      const { data: newEvent, error } = await supabase.from('events').insert({
        title: form.title,
        description: form.description,
        location: form.location,
        starts_at: safeParseDate(form.starts_at).toISOString(),
        organizer_id: profile.id,
        is_published: true,
        image_url: imageUrl,
      }).select().single();

      if (error) throw error;

      if (postToFeed && newEvent) {
        await supabase.from('posts').insert({
          author_id: profile.id,
          content: `📅 Event: ${form.title}\n📍 ${form.location}\n\n${form.description}`,
          is_event: true,
          event_id: newEvent.id,
          university_id: profile.university_id,
        });
      }

      setForm({ title: '', description: '', location: '', starts_at: '' });
      setCoverImage(null);
      setPostToFeed(false);
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      Alert.alert('Success', 'Event created!');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not create event.');
    } finally {
      setUploading(false);
    }
  };

  const events = eventsQuery.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        title="Events"
        showBack={true}
        onBack={() => navigation.goBack()}
      />
      <View style={{ padding: 16 }}>
        <FastButton
          onPress={() => setModalOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 12, padding: 14, gap: 8 }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Create Event</Text>
        </FastButton>
      </View>

      {eventsQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ef4444" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {events.length === 0 && (
            <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No events yet. Create the first one!</Text>
          )}
          {events.map((e: any) => (
            <TouchableOpacity
              key={e.id}
              onPress={() => navigation.navigate('EventDetail', { id: e.id })}
              style={{ backgroundColor: '#0a0a0a', borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#1f1f1f' }}
            >
              {e.image_url && <Image source={{ uri: e.image_url }} style={{ width: '100%', height: 160 }} />}
              <View style={{ padding: 14 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{e.title}</Text>
                <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={12} /> {new Date(e.starts_at).toLocaleString()}
                </Text>
                {e.location ? (
                  <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 4 }}>
                    <Ionicons name="location-outline" size={12} /> {e.location}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* CREATE EVENT MODAL */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1, backgroundColor: '#000' }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 20, fontWeight: '700' }}>Create Event</Text>
              <View style={{ width: 34 }} />
            </View>
            <Text style={{ color: '#6d7382', textAlign: 'center', marginBottom: 24 }}>Share what's happening</Text>

            <Text style={styles.label}>Cover image</Text>
            <TouchableOpacity onPress={pickCover} style={{ height: 160, borderRadius: 12, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 }}>
              {coverImage ? <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="image-outline" size={40} color="#6d7382" />}
            </TouchableOpacity>

            <Text style={styles.label}>Event title</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Programming Event" placeholderTextColor="#6d7382" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { minHeight: 100 }]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="What is this event about?" placeholderTextColor="#6d7382" multiline />

            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholder="Vision 2030 hall" placeholderTextColor="#6d7382" />

            <Text style={styles.label}>Date & Time</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text style={{ color: form.starts_at ? '#fff' : '#6d7382', fontSize: 15 }}>
                {form.starts_at ? new Date(form.starts_at).toLocaleString() : 'Pick a date and time'}
              </Text>
            </TouchableOpacity>
            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Select date & time</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ color: '#6d7382', fontSize: 11, marginBottom: 4 }}>YEAR</Text>
                      <TextInput style={{ backgroundColor: '#141414', borderRadius: 8, padding: 12, color: '#fff' }} value={String(selectedDate.getFullYear())} onChangeText={(v) => { const d = new Date(selectedDate); d.setFullYear(parseInt(v) || 2026); setSelectedDate(d); setForm({ ...form, starts_at: d.toISOString() }); }} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#6d7382', fontSize: 11, marginBottom: 4 }}>MONTH</Text>
                      <TextInput style={{ backgroundColor: '#141414', borderRadius: 8, padding: 12, color: '#fff' }} value={String(selectedDate.getMonth() + 1)} onChangeText={(v) => { const d = new Date(selectedDate); d.setMonth((parseInt(v) || 1) - 1); setSelectedDate(d); setForm({ ...form, starts_at: d.toISOString() }); }} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#6d7382', fontSize: 11, marginBottom: 4 }}>DAY</Text>
                      <TextInput style={{ backgroundColor: '#141414', borderRadius: 8, padding: 12, color: '#fff' }} value={String(selectedDate.getDate())} onChangeText={(v) => { const d = new Date(selectedDate); d.setDate(parseInt(v) || 1); setSelectedDate(d); setForm({ ...form, starts_at: d.toISOString() }); }} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#6d7382', fontSize: 11, marginBottom: 4 }}>HOUR (0-23)</Text>
                      <TextInput style={{ backgroundColor: '#141414', borderRadius: 8, padding: 12, color: '#fff' }} value={String(selectedDate.getHours())} onChangeText={(v) => { const d = new Date(selectedDate); d.setHours(parseInt(v) || 0); setSelectedDate(d); setForm({ ...form, starts_at: d.toISOString() }); }} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#6d7382', fontSize: 11, marginBottom: 4 }}>MINUTE</Text>
                      <TextInput style={{ backgroundColor: '#141414', borderRadius: 8, padding: 12, color: '#fff' }} value={String(selectedDate.getMinutes())} onChangeText={(v) => { const d = new Date(selectedDate); d.setMinutes(parseInt(v) || 0); setSelectedDate(d); setForm({ ...form, starts_at: d.toISOString() }); }} keyboardType="numeric" />
                    </View>
                  </View>
                  <FastButton onPress={() => setShowDatePicker(false)} style={{ backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
                  </FastButton>
                </View>
              </View>
            </Modal>


            <TouchableOpacity onPress={() => setPostToFeed(!postToFeed)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: postToFeed ? '#ef4444' : '#141414', alignItems: 'center', justifyContent: 'center' }}>
                {postToFeed && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={{ color: '#fff' }}>Also post this event to the Feed</Text>
            </TouchableOpacity>

            <FastButton
              onPress={create}
              disabled={uploading}
              style={{ backgroundColor: uploading ? '#7f1d1d' : '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{uploading ? 'Creating...' : 'Create event'}</Text>
            </FastButton>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: '#6d7382', fontSize: 12, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15 },
});
