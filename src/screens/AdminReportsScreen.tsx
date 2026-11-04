import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_ROWS = [
  { key: 'pending',   label: 'Pending',   color: '#eab308' },
  { key: 'reviewing', label: 'Reviewing', color: '#3b82f6' },
  { key: 'resolved',  label: 'Resolved',  color: '#22c55e' },
  { key: 'dismissed', label: 'Dismissed', color: '#6d7382' },
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

export default function AdminReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile: me } = useAuth();
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowOpen, setRowOpen] = useState<string | null>(null);
  const [active, setActive] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(300);

    if (!error && data) setReports(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (r: any, status: string) => {
    setBusy(true);
    const { error: updateErr } = await supabase.from('reports').update({
      status,
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', r.id);

    if (updateErr) { 
      setBusy(false); 
      Alert.alert('Update failed', updateErr.message); 
      return; 
    }

    await supabase.from('moderation_actions').insert({
      moderator_id: me.id,
      report_id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      action: status,
    });

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'resolve_report',
      target_type: r.target_type,
      target_id: r.target_id,
      details: { report_id: r.id, status },
    });

    if ((status === 'resolved' || status === 'dismissed') && r.reporter_id) {
      const body = status === 'resolved'
        ? 'Your report has been reviewed and resolved. Thank you for flagging it.'
        : 'After review, we were unable to take action on your report.';
      await supabase.from('notifications').insert({
        user_id: r.reporter_id,
        type: 'report_update',
        title: status === 'resolved' ? 'Report resolved' : 'Report reviewed',
        body,
        link: '/notifications',
        is_read: false,
      });
    }

    setBusy(false);
    setActive(null);
    load();
  };

  const counts = {
    pending: reports.filter(r => r.status === 'pending').length,
    reviewing: reports.filter(r => r.status === 'reviewing').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  };

  const rowReports = rowOpen ? reports.filter(r => r.status === rowOpen) : [];

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Ionicons name="flag" size={56} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Student Reports</Text>
          <Text style={styles.heroSub}>Reports submitted by students.</Text>
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

      {/* ROW DRAWER (List of Reports) */}
      <Modal visible={!!rowOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.drawerHandle} />
            
            <View style={styles.drawerHeader}>
              <View style={[styles.dot, { backgroundColor: STATUS_ROWS.find(r => r.key === rowOpen)?.color }]} />
              <View>
                <Text style={styles.drawerTitle}>{STATUS_ROWS.find(r => r.key === rowOpen)?.label}</Text>
                <Text style={styles.drawerSub}>{rowReports.length} reports</Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setRowOpen(null)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={rowReports}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>Nothing here.</Text>
              }
              renderItem={({ item: r }) => (
                <TouchableOpacity style={styles.reportRow} onPress={() => setActive(r)}>
                  <View style={styles.avatarWrap}>
                    {r.reporter?.avatar_url ? (
                      <Image source={{ uri: r.reporter.avatar_url }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person" size={20} color="#6d7382" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>
                      <Text style={{ fontWeight: '700' }}>{r.reporter?.full_name || 'Unknown'}</Text>
                      <Text style={{ color: '#6d7382' }}> reported a </Text>
                      <Text style={{ color: '#3b82f6', textTransform: 'uppercase', fontSize: 11, fontWeight: '700' }}>{r.target_type}</Text>
                    </Text>
                    <Text style={styles.reportReason} numberOfLines={2}>{r.reason}</Text>
                    <Text style={styles.reportTime}>{timeAgo(r.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ACTION DRAWER (Report Details) */}
      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
            <View style={styles.drawerHandle} />
            
            {active && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.activeHeader}>
                  <TouchableOpacity onPress={() => setActive(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.avatarWrapLarge}>
                    {active.reporter?.avatar_url ? (
                      <Image source={{ uri: active.reporter.avatar_url }} style={styles.avatarLarge} />
                    ) : (
                      <Ionicons name="person" size={32} color="#6d7382" />
                    )}
                  </View>
                  <Text style={styles.activeName}>{active.reporter?.full_name || 'Unknown'}</Text>
                  <Text style={[styles.activeStatus, { color: STATUS_ROWS.find((r) => r.key === active.status)?.color }]}>
                    {active.status}
                  </Text>
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailsHeader}>REPORT DETAILS</Text>
                  <DetailRow label="Reported" value={active.target_type} />
                  <DetailRow label="Submitted" value={timeAgo(active.created_at)} />
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailsHeader}>REASON</Text>
                  <Text style={styles.reasonText}>{active.reason}</Text>
                  {active.details && (
                    <>
                      <Text style={[styles.detailsHeader, { marginTop: 20 }]}>DETAILS</Text>
                      <Text style={styles.reasonText}>{active.details}</Text>
                    </>
                  )}
                </View>

                <View style={styles.actionBox}>
                  {(active.status === 'pending' || active.status === 'reviewing') ? (
                    <>
                      {active.status === 'pending' && (
                        <TouchableOpacity style={[styles.btn, { borderColor: '#3b82f6', borderWidth: 1.5 }]} onPress={() => resolve(active, 'reviewing')} disabled={busy}>
                          <Ionicons name="time" size={20} color="#3b82f6" />
                          <Text style={[styles.btnText, { color: '#3b82f6' }]}>Mark as reviewing</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.btn, { borderColor: '#22c55e', borderWidth: 1.5 }]} onPress={() => resolve(active, 'resolved')} disabled={busy}>
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                        <Text style={[styles.btnText, { color: '#22c55e' }]}>Resolve report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: '#1f1f1f' }]} onPress={() => resolve(active, 'dismissed')} disabled={busy}>
                        <Ionicons name="close-circle" size={20} color="#fff" />
                        <Text style={[styles.btnText, { color: '#fff' }]}>Dismiss</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.finalStatusBox}>
                      <Text style={styles.finalStatusText}>Final status: {active.status}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
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
      <Text style={styles.detailValue}>{value}</Text>
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

  reportRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 14 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  reportTitle: { color: '#fff', fontSize: 14, marginBottom: 4 },
  reportReason: { color: '#fff', fontSize: 14, lineHeight: 20 },
  reportTime: { color: '#6d7382', fontSize: 11, marginTop: 6 },

  activeHeader: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', position: 'relative' },
  closeBtn: { position: 'absolute', top: 0, right: 16, padding: 8 },
  avatarWrapLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  avatarLarge: { width: '100%', height: '100%' },
  activeName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  activeStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },

  detailsBox: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  detailsHeader: { color: '#6d7382', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  reasonText: { color: '#fff', fontSize: 14, lineHeight: 22 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  detailLabel: { color: '#6d7382', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '500', textAlign: 'right' },

  actionBox: { padding: 20, gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '600' },
  finalStatusBox: { padding: 14, backgroundColor: '#1f1f1f', borderRadius: 12, alignItems: 'center' },
  finalStatusText: { color: '#6d7382', fontSize: 13 },
});
