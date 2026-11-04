import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, Alert, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_ROWS = [
  { key: 'pending',  label: 'Pending review', color: '#eab308' },
  { key: 'approved', label: 'Approved',       color: '#22c55e' },
  { key: 'rejected', label: 'Rejected',       color: '#ef4444' },
  { key: 'all',      label: 'All payments',   color: '#6d7382' },
];

const CATEGORY_LABELS: Record<string, string> = {
  likes: 'Likes',
  comments: 'Comments',
  views: 'Views',
  followers: 'Followers',
  post: 'Boost duration',
  bundle: 'Campus Famous',
};

function purposeLabel(purpose: string, metadata: any) {
  switch (purpose) {
    case 'verify': return 'Verification';
    case 'followers':
      return `Followers · +${(metadata?.followers || 0).toLocaleString()}`;
    case 'post_boost': {
      const cat = metadata?.category;
      const qty = metadata?.quantity;
      if (cat && CATEGORY_LABELS[cat]) {
        return `${CATEGORY_LABELS[cat]}${qty ? ` · ${qty.toLocaleString()}` : ''}`;
      }
      return 'Post Boost';
    }
    default: return purpose;
  }
}

function timeAgo(date: string) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export default function AdminPaymentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile: me } = useAuth();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowOpen, setRowOpen] = useState<string | null>(null);
  const [active, setActive] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles:user_id(id, full_name, email, avatar_url, is_verified, displayed_follower_count)')
      .order('created_at', { ascending: false })
      .limit(300);
    if (!error && data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openPayment = (p: any) => {
    setActive(p);
    setRejectReason('');
  };

  const approveLinkedBoost = async (payment: any) => {
    if (payment.purpose !== 'post_boost' && payment.purpose !== 'followers') return { ok: true };

    const { data: found, error: findErr } = await supabase
      .from('boosts')
      .select('id, post_id, category, duration_days, delivery_days')
      .eq('payment_id', payment.id)
      .maybeSingle();
      
    if (findErr) return { ok: false, msg: findErr.message };

    if (!found) {
      const meta = payment.metadata || {};
      const postId = meta.post_id;
      const category = meta.category || 'likes';
      const quantity = Number(meta.quantity || 0);
      const durationDays = Number(meta.duration_days || 5);
      const packageId = meta.package_id || `${category}_${quantity}`;

      if (!postId || !quantity) return { ok: false, msg: 'Payment metadata missing post_id or quantity' };

      const { data: created, error: createErr } = await supabase
        .from('boosts')
        .insert({
          user_id: payment.user_id,
          payment_id: payment.id,
          post_id: postId,
          category,
          quantity,
          package_id: packageId,
          amount_ksh: payment.amount || 0,
          duration_days: durationDays,
          delivery_days: durationDays,
          delivered: 0,
          status: 'pending',
        })
        .select('id, post_id')
        .single();
        
      if (createErr) return { ok: false, msg: createErr.message };

      await supabase.from('posts').update({ boost_paid: true }).eq('id', postId);
      return { ok: true };
    }

    const now = new Date();
    const days = found.duration_days || found.delivery_days || 5;
    const expires = new Date(now.getTime() + days * 86400000);

    const { error: boostErr } = await supabase
      .from('boosts')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', found.id);
      
    if (boostErr) return { ok: false, msg: boostErr.message };

    if (found.post_id) {
      const postUpdate: any = { boost_paid: true };
      if (['post', 'bundle', 'likes', 'comments', 'views'].includes(found.category)) {
        postUpdate.boosted_until = expires.toISOString();
      }
      await supabase.from('posts').update(postUpdate).eq('id', found.post_id);
    }
    return { ok: true };
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);

    const { error } = await supabase
      .from('payments')
      .update({ status: 'approved', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq('id', active.id);
      
    if (error) { setBusy(false); return Alert.alert('Approve failed', error.message); }

    const boostRes = await approveLinkedBoost(active);
    if (!boostRes.ok) Alert.alert('Warning', 'Payment approved but boost update failed: ' + boostRes.msg);

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'approve_payment', target_type: 'payment', target_id: active.id,
      details: { mpesa_code: active.mpesa_code, user: active.profiles?.email, amount: active.amount, purpose: active.purpose },
    });

    let title = 'Payment approved';
    let body = '';
    if (active.purpose === 'verify') {
      title = 'You are now verified!';
      body = 'Your account shows the blue checkmark.';
    } else if (active.purpose === 'followers') {
      title = `+${(active.metadata?.followers || 0).toLocaleString()} followers added!`;
      body = 'Your follower boost is now delivering.';
    } else if (active.purpose === 'post_boost') {
      const cat = active.metadata?.category ? CATEGORY_LABELS[active.metadata.category] : 'Post';
      title = `${cat} boost approved!`;
      body = 'Your boost is now delivering.';
    }

    await supabase.from('notifications').insert({
      user_id: active.user_id, type: 'like', title, body,
      link: active.purpose === 'verify' ? `/profile/${active.user_id}` : '/get-boosted',
    });

    setBusy(false);
    setActive(null);
    load();
  };

  const reject = async () => {
    if (!active) return;
    setBusy(true);
    const reason = rejectReason.trim() || 'Payment could not be verified';

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: me.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', active.id);
      
    if (error) { setBusy(false); return Alert.alert('Reject failed', error.message); }

    if (active.purpose === 'post_boost' || active.purpose === 'followers') {
      await supabase
        .from('boosts')
        .update({ status: 'rejected', admin_note: reason, updated_at: new Date().toISOString() })
        .eq('payment_id', active.id);
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'reject_payment', target_type: 'payment', target_id: active.id,
      details: { reason, mpesa_code: active.mpesa_code, purpose: active.purpose },
    });

    await supabase.from('notifications').insert({
      user_id: active.user_id, type: 'like', title: 'Payment rejected',
      body: reason, link: '/get-boosted',
    });

    setBusy(false);
    setActive(null);
    load();
  };

  const revoke = async () => {
    if (!active) return;
    Alert.alert('Revoke', 'Revoke this payment reward?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        setBusy(true);
        await supabase.from('payments').update({ status: 'rejected', rejection_reason: 'Revoked by admin' }).eq('id', active.id);
        if (active.purpose === 'post_boost' || active.purpose === 'followers') {
          await supabase.from('boosts').update({ status: 'rejected', admin_note: 'Revoked by admin', updated_at: new Date().toISOString() }).eq('payment_id', active.id);
        }
        await supabase.from('admin_audit_logs').insert({ admin_id: me.id, action: 'revoke_payment', target_type: 'payment', target_id: active.id });
        setBusy(false);
        setActive(null);
        load();
      }}
    ]);
  };

  const counts: any = {};
  STATUS_ROWS.forEach((r) => {
    counts[r.key] = r.key === 'all' ? items.length : items.filter((p) => p.status === r.key).length;
  });

  const rowItems = rowOpen === 'all' ? items : rowOpen ? items.filter((p) => p.status === rowOpen) : [];

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Ionicons name="card" size={56} color="#22c55e" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Payments</Text>
          <Text style={styles.heroSub}>Review M-Pesa submissions, verify users, and manage boosts.</Text>
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
            <Text style={[styles.statusCount, { color: counts[r.key] > 0 ? '#fff' : '#6d7382' }]}>
              {counts[r.key]}
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
                <Text style={styles.drawerSub}>{rowItems.length} payments</Text>
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
              ListEmptyComponent={<Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>Nothing here.</Text>}
              renderItem={({ item: p }) => (
                <TouchableOpacity style={styles.paymentRow} onPress={() => openPayment(p)}>
                  <View style={styles.avatarWrap}>
                    {p.profiles?.avatar_url ? (
                      <Image source={{ uri: p.profiles.avatar_url }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person" size={20} color="#6d7382" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentName} numberOfLines={1}>{p.profiles?.full_name || 'Unknown'}</Text>
                    <Text style={styles.paymentSub} numberOfLines={1}>
                      {purposeLabel(p.purpose, p.metadata)} · KSh {p.amount} · {timeAgo(p.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ACTION DRAWER (Details) */}
      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
            <View style={styles.drawerHandle} />
            
            {active && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.activeHeader}>
                  <TouchableOpacity onPress={() => setActive(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.avatarWrapLarge}>
                    {active.profiles?.avatar_url ? (
                      <Image source={{ uri: active.profiles.avatar_url }} style={styles.avatarLarge} />
                    ) : (
                      <Ionicons name="person" size={32} color="#6d7382" />
                    )}
                  </View>
                  <Text style={styles.activeName}>{active.profiles?.full_name || 'Unknown'}</Text>
                  {active.profiles?.email && <Text style={styles.activeEmail}>{active.profiles.email}</Text>}
                  <Text style={[styles.activeStatus, { color: STATUS_ROWS.find((r) => r.key === active.status)?.color }]}>
                    {active.status}
                  </Text>
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailsHeader}>PAYMENT DETAILS</Text>
                  <DetailRow label="Purpose" value={purposeLabel(active.purpose, active.metadata)} />
                  <DetailRow label="Amount" value={`KSh ${active.amount}`} />
                  <DetailRow label="M-Pesa code" value={active.mpesa_code || '—'} />
                  <DetailRow label="Phone" value={active.phone || '—'} />
                  <DetailRow label="Submitted" value={timeAgo(active.created_at)} />
                  {active.rejection_reason && <DetailRow label="Reason" value={active.rejection_reason} />}
                </View>

                {active.status === 'pending' && (
                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsHeader}>NOTE TO USER (ON REJECTION)</Text>
                    <TextInput
                      style={styles.rejectInput}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      placeholder="Optional — e.g. code not found"
                      placeholderTextColor="#6d7382"
                      multiline
                    />
                  </View>
                )}

                <View style={styles.actionBox}>
                  {active.status === 'pending' && (
                    <>
                      <TouchableOpacity style={[styles.btn, { borderColor: '#22c55e', borderWidth: 1.5 }]} onPress={approve} disabled={busy}>
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                        <Text style={[styles.btnText, { color: '#22c55e' }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: '#1f1f1f' }]} onPress={reject} disabled={busy}>
                        <Ionicons name="close-circle" size={20} color="#f97316" />
                        <Text style={[styles.btnText, { color: '#f97316' }]}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {active.status === 'approved' && (
                    <TouchableOpacity style={[styles.btn, { borderColor: '#ef4444', borderWidth: 1 }]} onPress={revoke} disabled={busy}>
                      <Ionicons name="ban" size={18} color="#ef4444" />
                      <Text style={[styles.btnText, { color: '#ef4444' }]}>Revoke reward</Text>
                    </TouchableOpacity>
                  )}
                  {active.status === 'rejected' && (
                    <TouchableOpacity style={[styles.btn, { borderColor: '#22c55e', borderWidth: 1.5 }]} onPress={approve} disabled={busy}>
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      <Text style={[styles.btnText, { color: '#22c55e' }]}>Re-approve</Text>
                    </TouchableOpacity>
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

  paymentRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 14 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  paymentName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  paymentSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },

  activeHeader: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', position: 'relative' },
  closeBtn: { position: 'absolute', top: 0, right: 16, padding: 8 },
  avatarWrapLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  avatarLarge: { width: '100%', height: '100%' },
  activeName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  activeEmail: { color: '#6d7382', fontSize: 13, marginTop: 3 },
  activeStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },

  detailsBox: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  detailsHeader: { color: '#6d7382', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  detailLabel: { color: '#6d7382', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '500', textAlign: 'right' },

  rejectInput: { backgroundColor: '#141414', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },

  actionBox: { padding: 20, gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '600' },
});
