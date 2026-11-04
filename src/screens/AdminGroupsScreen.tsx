import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_ROWS = [
  { key: 'active',   label: 'Active',   color: '#22c55e' },
  { key: 'archived', label: 'Archived', color: '#ef4444' },
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

export default function AdminGroupsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowOpen, setRowOpen] = useState<string | null>(null);
  const [active, setActive] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('groups')
      .select('*, creator:profiles!groups_created_by_fkey(id, full_name, email)')
      .order('created_at', { ascending: false });
    if (!error && data) setGroups(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openGroup = (g: any) => {
    setActive(g);
  };

  const toggleArchive = async (g: any) => {
    setBusy(true);
    const next = !g.is_archived;
    
    // Optimistic UI update
    setGroups((old) => old.map((x) => x.id === g.id ? { ...x, is_archived: next } : x));
    setActive(null);

    const { error } = await supabase.from('groups').update({ is_archived: next }).eq('id', g.id);

    if (error) {
      setBusy(false);
      Alert.alert('Failed', error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id,
      action: next ? 'archive_group' : 'unarchive_group',
      target_type: 'group',
      target_id: g.id,
    });

    setBusy(false);
  };

  const remove = (g: any) => {
    Alert.alert('Delete Group', `Delete "${g.name}" permanently? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true);
        setGroups((old) => old.filter((x) => x.id !== g.id));
        setActive(null);

        const { error } = await supabase.from('groups').delete().eq('id', g.id);
        if (error) {
          setBusy(false);
          Alert.alert('Failed', error.message);
          load();
          return;
        }

        await supabase.from('admin_audit_logs').insert({
          admin_id: profile.id,
          action: 'delete_group',
          target_type: 'group',
          target_id: g.id,
          details: { name: g.name },
        });

        setBusy(false);
      }}
    ]);
  };

  const counts = {
    active: groups.filter((g) => !g.is_archived).length,
    archived: groups.filter((g) => g.is_archived).length,
  };

  const rowItems = rowOpen ? groups.filter((g) => rowOpen === 'archived' ? g.is_archived : !g.is_archived) : [];

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Ionicons name="people-circle" size={56} color="#ec4899" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Groups</Text>
          <Text style={styles.heroSub}>{groups.length} groups · manage student communities.</Text>
        </View>
      </View>

      <View style={styles.divider} />

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

      {/* ROW DRAWER (List) */}
      <Modal visible={!!rowOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.drawerHandle} />
            
            <View style={styles.drawerHeader}>
              <View style={[styles.dot, { backgroundColor: STATUS_ROWS.find(r => r.key === rowOpen)?.color }]} />
              <View>
                <Text style={styles.drawerTitle}>{STATUS_ROWS.find(r => r.key === rowOpen)?.label}</Text>
                <Text style={styles.drawerSub}>{rowItems.length} groups</Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setRowOpen(null)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={rowItems}
              keyExtractor={(g) => g.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={<Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>Nothing here.</Text>}
              renderItem={({ item: g }) => (
                <TouchableOpacity style={styles.groupRow} onPress={() => openGroup(g)}>
                  {g.cover_url ? (
                    <Image source={{ uri: g.cover_url }} style={styles.groupCover} />
                  ) : (
                    <View style={styles.groupCoverPlaceholder}>
                      <Ionicons name="people" size={24} color="#ef4444" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.groupSub} numberOfLines={1}>
                      {g.member_count ?? 0} members · {g.category || 'General'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ACTION DRAWER (Details) */}
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
                  {active.cover_url ? (
                    <Image source={{ uri: active.cover_url }} style={styles.avatarLarge} />
                  ) : (
                    <View style={styles.avatarWrapLarge}>
                      <Ionicons name="people" size={32} color="#ef4444" />
                    </View>
                  )}
                  <Text style={styles.activeName}>{active.name}</Text>
                  <Text style={[styles.activeStatus, { color: active.is_archived ? '#ef4444' : '#22c55e' }]}>
                    {active.is_archived ? 'Archived' : 'Active'}
                  </Text>
                </View>

                {active.description && (
                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsHeader}>DESCRIPTION</Text>
                    <Text style={styles.descText}>{active.description}</Text>
                  </View>
                )}

                <View style={styles.detailsBox}>
                  <Text style={styles.detailsHeader}>GROUP DETAILS</Text>
                  <DetailRow label="Category" value={active.category || 'General'} />
                  <DetailRow label="Members" value={String(active.member_count ?? 0)} />
                  <DetailRow label="Creator" value={active.creator?.full_name || '—'} />
                  <DetailRow label="Created" value={timeAgo(active.created_at)} />
                </View>

                <View style={styles.actionBox}>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: '#1f1f1f' }]} onPress={() => toggleArchive(active)} disabled={busy}>
                    <Ionicons name="ban" size={20} color="#f97316" />
                    <Text style={[styles.btnText, { color: '#f97316' }]}>{active.is_archived ? 'Restore group' : 'Archive group'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { borderColor: '#ef4444', borderWidth: 1.5 }]} onPress={() => remove(active)} disabled={busy}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                    <Text style={[styles.btnText, { color: '#ef4444' }]}>Delete permanently</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
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

  groupRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 14 },
  groupCover: { width: 48, height: 48, borderRadius: 12 },
  groupCoverPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  groupName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  groupSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },

  activeHeader: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', position: 'relative' },
  closeBtn: { position: 'absolute', top: 0, right: 16, padding: 8 },
  avatarLarge: { width: 80, height: 80, borderRadius: 16, marginBottom: 12 },
  avatarWrapLarge: { width: 80, height: 80, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  activeName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  activeStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },

  detailsBox: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  detailsHeader: { color: '#6d7382', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  descText: { color: '#fff', fontSize: 14, lineHeight: 22 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  detailLabel: { color: '#6d7382', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '500', textAlign: 'right' },

  actionBox: { padding: 20, gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '600' },
});
