import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function fullDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid Date'; // Protects against bad strings
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AdminEventsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '', is_published: true, image_url: '' });
  const [busy, setBusy] = useState(false);
  
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').order('starts_at', { ascending: false });
    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: '', description: '', location: '', starts_at: '', is_published: true, image_url: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = (ev: any) => {
    setActive(null);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      location: ev.location || '',
      starts_at: ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16).replace('T', ' ') : '',
      is_published: ev.is_published !== false,
      image_url: ev.image_url ? String(ev.image_url) : '',
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    
    setBusy(true);
    try {
      const file = result.assets[0];
      const ext = file.uri.split('.').pop() || 'jpg';
      const path = `events/${Date.now()}.${ext}`;
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const { error: upErr } = await supabase.storage.from('events').upload(path, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage.from('events').getPublicUrl(path);
      setForm({ ...form, image_url: publicUrl });
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) return Alert.alert('Error', 'Title is required');
    if (!form.starts_at) return Alert.alert('Error', 'Date & time is required');
    
    // Replace the space with a 'T' so JavaScript parses it correctly on all devices
    const safeDateString = form.starts_at.replace(' ', 'T');
    const parsedDate = new Date(safeDateString);
    
    if (isNaN(parsedDate.getTime())) {
      return Alert.alert('Invalid Date', 'Please enter the date in this exact format:\nYYYY-MM-DD HH:MM\ne.g. 2026-11-15 18:30');
    }

    setBusy(true);
    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      starts_at: parsedDate.toISOString(),
      is_published: form.is_published,
      image_url: form.image_url,
      organizer_id: profile.id,
    };

    if (isEditing && active) {
      await supabase.from('events').update(payload).eq('id', active.id);
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'update_event', target_type: 'event', target_id: active.id });
    } else {
      await supabase.from('events').insert(payload);
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'create_event', target_type: 'event', details: { title: form.title } });
    }
    
    setBusy(false);
    setShowForm(false);
    
    // Force a small delay to ensure Supabase has committed the write
    setTimeout(() => {
      load();
    }, 300);
  };

  const remove = (ev: any) => {
    Alert.alert('Delete Event', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setActive(null);
        await supabase.from('events').delete().eq('id', ev.id);
        await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'delete_event', target_type: 'event', target_id: ev.id });
        load();
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Ionicons name="calendar" size={56} color="#8b5cf6" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Events</Text>
          <Text style={styles.heroSub}>Manage campus events, dates, and schedules.</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(ev) => ev.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <TouchableOpacity style={styles.newRow} onPress={openNew}>
              <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.newRowText}>Create New Event</Text>
              <Ionicons name="chevron-forward" size={20} color="#6d7382" />
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No events found.</Text>
          }
          renderItem={({ item: ev }) => (
            <TouchableOpacity style={styles.eventRow} onPress={() => setActive(ev)}>
              {ev.image_url ? (
                <Image source={{ uri: ev.image_url }} style={styles.eventThumbnail} />
              ) : (
              <View style={styles.eventDateBox}>
                <Text style={styles.eventMonth}>{new Date(ev.starts_at).toLocaleDateString([], { month: 'short' }).toUpperCase()}</Text>
                <Text style={styles.eventDay}>{String(new Date(ev.starts_at).getDate()).padStart(2, '0')}</Text>
              </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={styles.eventSub} numberOfLines={1}>{fullDate(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ''}</Text>
              </View>
              {!ev.is_published && <Text style={styles.draftBadge}>Draft</Text>}
              <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* DETAILS MODAL */}
      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.drawerHandle} />
            {active && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{active.title}</Text>
                  <TouchableOpacity onPress={() => setActive(null)} style={{ padding: 8 }}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDate}>{fullDate(active.starts_at)}</Text>
                {active.image_url && (
                  <Image source={{ uri: active.image_url }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 20 }} resizeMode="cover" />
                )}
                
                {active.description && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                    <Text style={styles.modalText}>{active.description}</Text>
                  </View>
                )}
                {active.location && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>LOCATION</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="location" size={16} color="#6d7382" />
                      <Text style={styles.modalText}>{active.location}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.actionWrap}>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: '#3b82f6' }]} onPress={() => openEdit(active)}>
                    <Ionicons name="pencil" size={20} color="#3b82f6" />
                    <Text style={[styles.actionText, { color: '#3b82f6' }]}>Edit event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: '#ef4444' }]} onPress={() => remove(active)}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete permanently</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* FORM MODAL */}
      <Modal visible={showForm} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.drawerHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Event' : 'New Event'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={[styles.input, { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#6d7382' }]} onPress={pickImage}>
                {form.image_url ? (
                  <Image source={{ uri: form.image_url }} style={{ width: '100%', height: 150, borderRadius: 8 }} resizeMode="cover" />
                ) : (
                  <>
                    <Ionicons name="camera" size={28} color="#6d7382" />
                    <Text style={{ color: '#6d7382', marginTop: 8, fontSize: 13, fontWeight: '600' }}>Add Cover Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput style={styles.input} placeholder="Event Title" placeholderTextColor="#6d7382" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
              <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Description" placeholderTextColor="#6d7382" multiline value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
              <TextInput style={styles.input} placeholder="Location" placeholderTextColor="#6d7382" value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} />
              
              <TextInput 
                style={styles.input} 
                placeholder="Date & Time (YYYY-MM-DD HH:MM)" 
                placeholderTextColor="#6d7382" 
                value={form.starts_at} 
                onChangeText={(v) => setForm({ ...form, starts_at: v })} 
              />

              <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, is_published: !form.is_published })}>
                <Text style={styles.toggleText}>Published</Text>
                <Text style={[styles.toggleStatus, { color: form.is_published ? '#22c55e' : '#6d7382' }]}>{form.is_published ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEditing ? 'SAVE CHANGES' : 'CREATE EVENT'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hero: { paddingHorizontal: 16, paddingBottom: 24, backgroundColor: '#000' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent: { alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  heroSub: { color: '#6d7382', fontSize: 13, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },

  newRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  newRowText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' },

  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 14 },
  eventThumbnail: { width: 52, height: 52, borderRadius: 12 },
  eventDateBox: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  eventMonth: { color: '#ef4444', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  eventDay: { color: '#fff', fontSize: 18, fontWeight: '700' },
  eventTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  eventSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  draftBadge: { color: '#6d7382', fontSize: 10, fontWeight: '700', backgroundColor: '#1f1f1f', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },
  modalDate: { color: '#6d7382', fontSize: 13, paddingHorizontal: 20, marginBottom: 20 },

  modalSection: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  sectionLabel: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  modalText: { color: '#fff', fontSize: 14, lineHeight: 22 },

  actionWrap: { padding: 20, gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  actionText: { fontSize: 15, fontWeight: '600' },

  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#141414', padding: 16, borderRadius: 12 },
  toggleText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  toggleStatus: { fontSize: 12, fontWeight: '800' },
  saveBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
