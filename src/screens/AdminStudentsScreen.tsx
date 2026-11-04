import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SELECT_COLS = 'id, email, full_name, username, avatar_url, faculty, course, year_of_study, university_name, role_id, is_verified, is_suspended, is_broadcast_only, is_bot, created_at, displayed_follower_count, approval_status, roles(name, level)';

function fullDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminStudentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile: me } = useAuth();
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(SELECT_COLS)
      .order('created_at', { ascending: false })
      .limit(300);
      
    if (!error && data) setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filtered = (students || []).filter((s) => {
    if (!q.trim()) return true;
    const term = q.trim().toLowerCase();
    const name = (s.full_name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const uname = (s.username || '').toLowerCase();
    return name.includes(term) || email.includes(term) || uname.includes(term);
  });

  const drawer = (drawerId && students) ? (students || []).find((s) => s.id === drawerId) : null;

  const logAction = async (action: string, targetId: string, details = {}) => {
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action,
      target_type: 'profile',
      target_id: targetId,
      details,
    });
  };

  const toggleSuspend = async (s: any) => {
    const newStatus = !s.is_suspended;
    Alert.alert(
      newStatus ? 'Suspend Account' : 'Reactivate Account',
      `Are you sure you want to ${newStatus ? 'suspend' : 'reactivate'} ${s.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          setBusy(s.id);
          const { error } = await supabase
            .from('profiles')
            .update({ is_suspended: newStatus, suspended_reason: newStatus ? 'Admin action' : null })
            .eq('id', s.id);
          
          if (error) { Alert.alert('Error', error.message); setBusy(null); return; }
          
          await logAction(newStatus ? 'suspend_user' : 'reactivate_user', s.id);
          setBusy(null);
          loadStudents();
        }}
      ]
    );
  };

  const banUser = async (s: any) => {
    Alert.alert(
      'Ban Account',
      `Ban ${s.full_name}? They will lose access to LU CONNECT.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Ban', style: 'destructive', onPress: async () => {
          setBusy(s.id);
          const { error } = await supabase
            .from('profiles')
            .update({ approval_status: 'banned' })
            .eq('id', s.id);
          
          if (error) { Alert.alert('Error', error.message); setBusy(null); return; }
          
          await logAction('ban_user', s.id);
          setBusy(null);
          loadStudents();
        }}
      ]
    );
  };

  const approveUser = async (s: any) => {
    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', s.id);
    
    if (error) { Alert.alert('Error', error.message); setBusy(null); return; }
    
    await logAction('approve_user', s.id);
    setBusy(null);
    loadStudents();
  };

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Ionicons name="people" size={56} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Students</Text>
          <Text style={styles.heroSub}>Manage students, verify accounts, suspend or ban abusers.</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#6d7382" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or username"
          placeholderTextColor="#6d7382"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ('')}>
            <Ionicons name="close-circle" size={20} color="#6d7382" />
          </TouchableOpacity>
        )}
      </View>

      {/* STUDENT LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ color: '#6d7382', textAlign: 'center', padding: 40 }}>
              {q ? 'No students match your search' : 'No students yet'}
            </Text>
          }
          renderItem={({ item: s }) => {
            const role = s.roles?.name || 'student';
            return (
              <TouchableOpacity style={styles.studentRow} onPress={() => setDrawerId(s.id)}>
                <View style={styles.avatarWrap}>
                  {s.avatar_url ? (
                    <Image source={{ uri: s.avatar_url }} style={styles.avatar} />
                  ) : (
                    <Ionicons name="person" size={24} color="#6d7382" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{s.full_name || 'Unnamed'}</Text>
                  {(role !== 'student' || s.is_suspended || s.approval_status === 'banned' || s.is_bot) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {s.is_bot && <Text style={{ color: '#a855f7', fontSize: 12 }}>Bot</Text>}
                      {!s.is_bot && role !== 'student' && (
                        <Text style={{ color: '#6d7382', fontSize: 12, textTransform: 'capitalize' }}>{role.replace('_', ' ')}</Text>
                      )}
                      {s.is_suspended && <Text style={{ color: '#f97316', fontSize: 12 }}>Suspended</Text>}
                      {s.approval_status === 'banned' && <Text style={{ color: '#ef4444', fontSize: 12 }}>Banned</Text>}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* DETAIL DRAWER */}
      <Modal visible={!!drawer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.drawerHandle} />
            
            {drawer && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.drawerHeader}>
                  <TouchableOpacity onPress={() => setDrawerId(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.avatarWrapLarge}>
                    {drawer.avatar_url ? (
                      <Image source={{ uri: drawer.avatar_url }} style={styles.avatarLarge} />
                    ) : (
                      <Ionicons name="person" size={36} color="#6d7382" />
                    )}
                  </View>
                  <Text style={styles.drawerName}>{drawer.full_name || 'Unnamed'}</Text>
                  {drawer.username && <Text style={styles.drawerUsername}>@{drawer.username}</Text>}
                </View>

                <View style={styles.infoBox}>
                  <InfoRow icon="mail" label="Email" value={drawer.email} />
                  <InfoRow icon="id-card" label="User ID" value={drawer.id} />
                  <InfoRow icon="business" label="University" value={drawer.university_name || '—'} />
                  <InfoRow icon="school" label="Faculty" value={drawer.faculty || '—'} />
                  <InfoRow icon="book" label="Course" value={drawer.course || '—'} />
                  <InfoRow icon="calendar" label="Year" value={drawer.year_of_study || '—'} />
                  <InfoRow icon="people" label="Role" value={(drawer.roles?.name || 'student').replace('_', ' ')} />
                  <InfoRow icon="time" label="Joined" value={fullDate(drawer.created_at)} />
                </View>

                <View style={styles.chipsBox}>
                  {drawer.is_bot && <Chip label="Bot" color="#a855f7" />}
                  {drawer.is_suspended && <Chip label="Suspended" color="#f97316" />}
                  {drawer.approval_status === 'banned' && <Chip label="Banned" color="#ef4444" />}
                  {drawer.approval_status === 'pending' && <Chip label="Pending approval" color="#eab308" />}
                  {drawer.is_verified && <Chip label="Verified" color="#22c55e" />}
                  {!drawer.is_bot && !drawer.is_suspended && drawer.approval_status !== 'banned' && drawer.approval_status !== 'pending' && !drawer.is_verified && (
                    <Chip label="Active" color="#6d7382" />
                  )}
                </View>

                {/* ACTIONS */}
                {(() => {
                  const targetLevel = drawer.roles?.level ?? 0;
                  const isSelf = drawer.id === me?.id;
                  const isProtected = targetLevel >= 3 || isSelf;
                  const isBot = drawer.is_bot === true;

                  if (isBot) return <View style={styles.noticeBox}><Text style={styles.noticeText}>This is a system bot account. Manage bots from Settings.</Text></View>;
                  if (isProtected) return <View style={styles.noticeBox}><Text style={styles.noticeText}>{isSelf ? 'This is your own account.' : 'Super admins are protected.'}</Text></View>;

                  return (
                    <View style={styles.actionBox}>
                      {drawer.approval_status === 'pending' && (
                        <TouchableOpacity style={[styles.btn, { borderColor: '#22c55e', borderWidth: 1.5 }]} onPress={() => approveUser(drawer)} disabled={busy === drawer.id}>
                          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                          <Text style={[styles.btnText, { color: '#22c55e' }]}>Approve account</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.btn, { backgroundColor: '#1f1f1f' }]} onPress={() => toggleSuspend(drawer)} disabled={busy === drawer.id}>
                        <Ionicons name="ban" size={20} color="#f97316" />
                        <Text style={[styles.btnText, { color: '#f97316' }]}>{drawer.is_suspended ? 'Reactivate account' : 'Suspend account'}</Text>
                      </TouchableOpacity>
                      {drawer.approval_status !== 'banned' && (
                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444' }]} onPress={() => banUser(drawer)} disabled={busy === drawer.id}>
                          <Ionicons name="close-circle" size={20} color="#fff" />
                          <Text style={[styles.btnText, { color: '#fff' }]}>Ban account</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string, label: string, value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color="#6d7382" />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, label === 'Role' && { textTransform: 'capitalize' }]} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Chip({ label, color }: { label: string, color: string }) {
  return (
    <View style={[styles.chip, { borderColor: `${color}55`, backgroundColor: `${color}15` }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
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

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14, marginLeft: 10 },

  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 14 },
  avatarWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  studentName: { color: '#fff', fontSize: 16, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: '40%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  
  drawerHeader: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', position: 'relative' },
  closeBtn: { position: 'absolute', top: 0, right: 16, padding: 8 },
  avatarWrapLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  avatarLarge: { width: '100%', height: '100%' },
  drawerName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  drawerUsername: { color: '#6d7382', fontSize: 13 },

  infoBox: { paddingVertical: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#0a0a0a' },
  infoLabel: { color: '#6d7382', fontSize: 12, marginBottom: 2 },
  infoValue: { color: '#fff', fontSize: 15, fontWeight: '500' },

  chipsBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },

  actionBox: { padding: 20, gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '600' },
  noticeBox: { padding: 20 },
  noticeText: { color: '#6d7382', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
