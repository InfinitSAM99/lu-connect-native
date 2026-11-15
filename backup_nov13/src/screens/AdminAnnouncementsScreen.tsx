import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function timeAgo(date: string) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function AdminAnnouncementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', is_pinned: false, is_important: false, is_published: true });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('published_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: '', description: '', is_pinned: false, is_important: false, is_published: true });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = (a: any) => {
    setActive(null);
    setForm({
      title: a.title || '',
      description: a.description || '',
      is_pinned: !!a.is_pinned,
      is_important: !!a.is_important,
      is_published: a.is_published !== false,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) return Alert.alert('Error', 'Title and description required');
    setBusy(true);

    if (isEditing && active) {
      await supabase.from('announcements').update(form).eq('id', active.id);
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'update_announcement', target_type: 'announcement', target_id: active.id });
    } else {
      await supabase.from('announcements').insert({ ...form, author_id: profile.id });
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'create_announcement', target_type: 'announcement', details: { title: form.title } });
    }

    setBusy(false);
    setShowForm(false);
    load();
  };

  const remove = (a: any) => {
    Alert.alert('Delete Announcement', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setActive(null);
        await supabase.from('announcements').delete().eq('id', a.id);
        await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'delete_announcement', target_type: 'announcement', target_id: a.id });
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
          <View style={styles.logoBox}>
            <Text style={styles.logoTextLU}>LU</Text>
          </View>
          <Text style={styles.logoTextConnect}>LU CONNECT</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>Announcements</Text>
            <Text style={styles.pageSub}>{items.length} campus-wide broadcasts.</Text>
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="megaphone-outline" size={64} color="#1f1f1f" />
              <Text style={{ color: '#6d7382', marginTop: 16, fontSize: 16 }}>No announcements yet</Text>
            </View>
          )
        }
        renderItem={({ item: a }) => (
          <TouchableOpacity style={styles.annRow} onPress={() => setActive(a)} activeOpacity={0.7}>
            <View style={styles.iconWrap}>
              <Ionicons 
                name={a.is_pinned ? "pin" : a.is_important ? "alert-circle" : "megaphone"} 
                size={24} 
                color={a.is_pinned ? "#ef4444" : a.is_important ? "#eab308" : "#6d7382"} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={styles.annTitle} numberOfLines={1}>{a.title}</Text>
                {!a.is_published && <Text style={styles.draftTag}>DRAFT</Text>}
              </View>
              <Text style={styles.annDesc} numberOfLines={2}>{a.description}</Text>
              <Text style={styles.annTime}>{timeAgo(a.published_at)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
          </TouchableOpacity>
        )}
      />

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 90 }]} 
        onPress={openNew}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* DETAILS MODAL */}
      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
            <View style={styles.drawerHandle} />
            {active && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{active.title}</Text>
                  <TouchableOpacity onPress={() => setActive(null)} style={{ padding: 8, marginLeft: 'auto' }}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDate}>{timeAgo(active.published_at)}</Text>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalText}>{active.description}</Text>
                </View>

                <View style={styles.actionWrap}>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: '#3b82f6' }]} onPress={() => openEdit(active)}>
                    <Ionicons name="pencil" size={20} color="#3b82f6" />
                    <Text style={[styles.actionText, { color: '#3b82f6' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: '#ef4444' }]} onPress={() => remove(active)}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
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
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
            <View style={styles.drawerHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Announcement' : 'New Announcement'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={{ padding: 8, marginLeft: 'auto' }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
              <TextInput style={styles.input} placeholder="Announcement Title" placeholderTextColor="#6d7382" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
              <TextInput style={[styles.input, { height: 140, textAlignVertical: 'top' }]} placeholder="Write your message here..." placeholderTextColor="#6d7382" multiline value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              <View style={{ gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, is_pinned: !form.is_pinned })}>
                  <Text style={styles.toggleText}>Pin to top</Text>
                  <Ionicons name={form.is_pinned ? "checkbox" : "square-outline"} size={24} color={form.is_pinned ? "#ef4444" : "#6d7382"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, is_important: !form.is_important })}>
                  <Text style={styles.toggleText}>Mark important</Text>
                  <Ionicons name={form.is_important ? "checkbox" : "square-outline"} size={24} color={form.is_important ? "#eab308" : "#6d7382"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, is_published: !form.is_published })}>
                  <Text style={styles.toggleText}>Published</Text>
                  <Ionicons name={form.is_published ? "checkbox" : "square-outline"} size={24} color={form.is_published ? "#22c55e" : "#6d7382"} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEditing ? 'SAVE CHANGES' : 'PUBLISH'}</Text>}
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
  
  hero: { paddingHorizontal: 16, paddingBottom: 20, backgroundColor: '#000' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent: { alignItems: 'center' },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },

  headerSection: { paddingHorizontal: 16, paddingVertical: 20 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  pageSub: { color: '#6d7382', fontSize: 13 },

  annRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16, gap: 16 },
  iconWrap: { width: 40, alignItems: 'center', justifyContent: 'center' },
  annTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  annDesc: { color: '#aab0bd', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  annTime: { color: '#6d7382', fontSize: 12, fontWeight: '500' },
  draftTag: { color: '#6d7382', fontSize: 9, fontWeight: '800', letterSpacing: 1, backgroundColor: '#1f1f1f', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  fab: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },
  modalDate: { color: '#6d7382', fontSize: 13, paddingHorizontal: 20, marginBottom: 20 },

  modalSection: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  modalText: { color: '#fff', fontSize: 15, lineHeight: 24 },

  actionWrap: { padding: 20, gap: 12, flexDirection: 'row' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  actionText: { fontSize: 15, fontWeight: '600' },

  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  
  saveBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
