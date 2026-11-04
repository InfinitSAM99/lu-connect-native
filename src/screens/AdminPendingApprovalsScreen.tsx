import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_ROWS = [
  { key: 'pending', label: 'Pending', color: '#eab308' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
];

function timeAgo(date: string) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export default function AdminPendingApprovalsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile: me } = useAuth();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowOpen, setRowOpen] = useState<string | null>(null);
  const [active, setActive] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, avatar_url, faculty, course, year_of_study, admission_number, approval_status, is_bot, created_at')
      .eq('is_bot', false)
      .in('approval_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(300);

    if (!error && data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async () => {
    if (!active) return;
    const target = active;
    setBusy(true);

    // Optimistic UI update
    setItems((prev) => prev.filter((x) => x.id !== target.id));
    setActive(null);

    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', target.id);

    if (error) {
      setBusy(false);
      Alert.alert('Approve failed', error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'approve_student',
      target_type: 'profile',
      target_id: target.id,
      details: { email: target.email, name: target.full_name },
    });

    await supabase.from('notifications').insert({
      user_id: target.id,
      type: 'account',
      title: 'Account approved',
      body: 'Welcome to LU CONNECT! Your account is now active.',
      link: '/',
      is_read: false,
    });

    setBusy(false);
  };

  const reject = async () => {
    if (!active) return;
    const target = active;
    setBusy(true);

    setItems((prev) => prev.filter((x) => x.id !== target.id));
    setActive(null);

    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'rejected' })
      .eq('id', target.id);

    if (error) {
      setBusy(false);
      Alert.alert('Reject failed', error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'reject_student',
      target_type: 'profile',
      target_id: target.id,
      details: { email: target.email, name: target.full_name },
    });

    await supabase.from('notifications').insert({
      user_id: target.id,
      type: 'account',
      title: 'Account not approved',
      body: 'Your LU CONNECT account was not approved. Contact support if you believe this is an error.',
      link: '/',
      is_read: false,
    });

    setBusy(false);
  };

  const counts = {
    pending: items.filter((p) => p.approval_status === 'pending').length,
    rejected: items.filter((p) => p.approval_status === 'rejected').length,
  };

  const rowItems = rowOpen ? items.filter((p) => p.approval_status === rowOpen) : [];

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Ionicons name="time" size={56} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Pending Approvals</Text>
          <Text style={styles.heroSub}>Approve new signups or review rejected accounts.</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* STATUS ROWS */}
      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        STATUS_ROWS.map((r) => (
          <TouchableOpacity key={r.key} style={styles.statusRow} onPress={() => setRowOpen(r.key)}>
            <View style={[styles.dot, { backgroundColor: r.color }]} />
            <Text style={styles.statusLabel}>{r.label}</Text>
            <Text style={[styles.statusCount, { color: counts[r.key as keyof typeof counts] > 0 ? '#fff' : '#6d7382' }]}>
              {counts[r.key as keyof typeof counts]}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#6d7382" />
          </TouchableOpacity>
        ))
      )}

      {/* ROW DRAWER (List of Users) */}
      <Modal visible={!!rowOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.drawerHandle} />
            
            <View style={styles.drawerHeader}>
              <View style={[styles.dot, { backgroundColor: STATUS_ROWS.find(r => r.key === rowOpen)?.color }]} />
              <View>
                <Text style={styles.drawerTitle}>{STATUS_ROWS.find(r => r.key === rowOpen)?.label}</Text>
                <Text style={styles.drawerSub}>{rowItems.length} applicants</Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setRowOpen(null)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={rowItems}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>Nothing here.</Text>
              }
              renderItem={({ item: p }) => (
                <TouchableOpacity style={styles.userRow} onPress={() => setActive(p)}>
                  <View style={styles.avatarWrap}>
                    {p.avatar_url ? (
                      <Image source={{ uri: p.avatar_url }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person" size={20} color="#6d7382" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{p.full_name || 'Unknown'}</Text>
                    <Text style={styles.userSub} numberOfLines={1}>{p.email || '—'} · {timeAgo(p.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ACTION DRAWER (User Details) */}
      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.drawerHandle} />
            
            {active && (
              <>
                <View style={styles.activeHeader}>
                  <TouchableOpacity onPress={() => setActive(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.avatarWrapLarge}>
                    {active.avatar_url ? (
                      <Image source={{ uri: active.avatar_url }} style={styles.avatarLarge} />
                    ) : (
                      <Ionicons name="person" size={32} color="#6d7382" />
                    )}
                  </View>
                  <Text style={styles.activeName}>{active.full_name || 'Unknown'}</Text>
                  {active.username && <Text style={styles.activeUsername}>@{active.username}</Text>}
                  <Text style={[styles.activeStatus, { color: STATUS_ROWS.find((r) => r.key === active.approval_status)?.color }]}>
                    {active.approval_status}
                  </Text>
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailsHeader}>APPLICANT DETAILS</Text>
                  <DetailRow label="Email" value={active.email || '—'} />
                  {active.admission_number && <DetailRow label="Admission No." value={active.admission_number} />}
                  {active.faculty && <DetailRow label="Faculty" value={active.faculty} />}
                  {active.course && <DetailRow label="Course" value={active.course} />}
                  {active.year_of_study && <DetailRow label="Year" value={`Year ${active.year_of_study}`} />}
                  <DetailRow label="Signed up" value={timeAgo(active.created_at)} />
                </View>

                <View style={styles.actionBox}>
                  {active.approval_status === 'pending' && (
                    <>
                      <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={approve} disabled={busy}>
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                        <Text style={[styles.btnText, { color: '#22c55e' }]}>Approve account</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={reject} disabled={busy}>
                        <Ionicons name="close-circle" size={20} color="#f97316" />
                        <Text style={[styles.btnText, { color: '#f97316' }]}>Reject account</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {active.approval_status === 'rejected' && (
                    <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={approve} disabled={busy}>
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      <Text style={[styles.btnText, { color: '#22c55e' }]}>Approve anyway</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
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
  divider: { height: 1, backgroundColor: '#1f1f1f' },

  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' },
  statusCount: { fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: '40%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 12 },
  drawerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  drawerSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },

  userRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 14 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  userName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  userSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },

  activeHeader: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', position: 'relative' },
  closeBtn: { position: 'absolute', top: 0, right: 16, padding: 8 },
  avatarWrapLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  avatarLarge: { width: '100%', height: '100%' },
  activeName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  activeUsername: { color: '#6d7382', fontSize: 13, marginTop: 3 },
  activeStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },

  detailsBox: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  detailsHeader: { color: '#6d7382', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  detailLabel: { color: '#6d7382', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '500', textAlign: 'right', maxWidth: '60%' },

  actionBox: { padding: 20, gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnApprove: { borderWidth: 1.5, borderColor: '#22c55e', backgroundColor: 'transparent' },
  btnReject: { backgroundColor: '#1f1f1f' },
  btnText: { fontSize: 15, fontWeight: '600' },
});
