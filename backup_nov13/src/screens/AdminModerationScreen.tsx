import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Image, Alert, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS: Record<string, string> = {
  nudity: 'Nudity', hate: 'Hate Speech', harassment: 'Harassment',
  spam: 'Spam', self_harm: 'Self Harm', violence: 'Violence',
  other: 'Other', none: 'None',
};

const CATEGORY_COLORS: Record<string, string> = {
  nudity: '#ec4899', hate: '#dc2626', harassment: '#f97316',
  spam: '#eab308', self_harm: '#8b5cf6', violence: '#b91c1c',
  other: '#6b7280', none: '#6b7280',
};

export default function AdminModerationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [activeFlag, setActiveFlag] = useState<any>(null); // Controls the inner detail view
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('moderation_flags').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) { setLoading(false); return; }

    const authorIds = [...new Set((data || []).map((f: any) => f.author_id).filter(Boolean))];
    const authorMap: any = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', authorIds);
      (profiles || []).forEach((p: any) => { authorMap[p.id] = p; });
    }

    setFlags((data || []).map((f: any) => ({ ...f, author: authorMap[f.author_id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const closeAll = () => {
    setActiveFlag(null);
    setDrawer(null);
  };

  const approve = () => {
    if (!activeFlag) return;
    Alert.alert('Keep Post', 'Mark this as a false positive? The post stays up.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        setBusy(true);
        await supabase.from('moderation_flags').update({ status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', activeFlag.id);
        setBusy(false); closeAll(); load();
      }}
    ]);
  };

  const removeContent = () => {
    if (!activeFlag) return;
    Alert.alert('Remove Post', 'Hide this post from all users?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setBusy(true);
        await supabase.from('posts').update({ is_deleted: true }).eq('id', activeFlag.content_id);
        await supabase.from('moderation_flags').update({ status: 'removed', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', activeFlag.id);
        setBusy(false); closeAll(); load();
      }}
    ]);
  };

  const banAuthor = () => {
    if (!activeFlag || !activeFlag.author_id) return;
    Alert.alert('Ban User', `Ban ${activeFlag.author?.full_name || 'this user'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ban', style: 'destructive', onPress: async () => {
        setBusy(true);
        await supabase.from('profiles').update({ approval_status: 'banned' }).eq('id', activeFlag.author_id);
        await supabase.from('moderation_flags').update({ status: 'banned', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', activeFlag.id);
        setBusy(false); closeAll(); load();
      }}
    ]);
  };

  const counts = {
    pending: flags.filter((f) => f.status === 'pending').length,
    approved: flags.filter((f) => f.status === 'approved').length,
    removed: flags.filter((f) => f.status === 'removed').length,
    banned: flags.filter((f) => f.status === 'banned').length,
    all: flags.length,
  };

  const CATEGORIES = [
    { key: 'pending', label: 'Pending Review', icon: 'time', color: '#f97316' },
    { key: 'approved', label: 'Approved (Safe)', icon: 'checkmark-circle', color: '#22c55e' },
    { key: 'removed', label: 'Removed Content', icon: 'trash', color: '#dc2626' },
    { key: 'banned', label: 'Banned Users', icon: 'ban', color: '#b91c1c' },
    { key: 'all', label: 'All Flags', icon: 'documents', color: '#ffffff' },
  ];

  const drawerItems = drawer === 'all' ? flags : drawer ? flags.filter((f) => f.status === drawer) : [];

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.logoBox}><Text style={styles.logoTextLU}>LU</Text></View>
          <Text style={styles.logoTextConnect}>AI MODERATION</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Review Queue</Text>
        <Text style={styles.pageSub}>Content automatically flagged by AI for review.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        CATEGORIES.map((c) => (
          <TouchableOpacity key={c.key} style={styles.catRow} onPress={() => { setActiveFlag(null); setDrawer(c.key); }} activeOpacity={0.7}>
            <View style={styles.iconWrap}>
              <Ionicons name={c.icon as any} size={26} color={c.color} />
            </View>
            <Text style={styles.catLabel}>{c.label}</Text>
            <Text style={[styles.catCount, { color: counts[c.key as keyof typeof counts] > 0 ? '#fff' : '#6d7382' }]}>
              {counts[c.key as keyof typeof counts]}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
          </TouchableOpacity>
        ))
      )}

      <Modal visible={!!drawer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
            <View style={styles.drawerHandle} />
            
            {activeFlag ? (
              /* DETAIL VIEW INSIDE DRAWER */
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.detailHeader}>
                  <TouchableOpacity onPress={() => setActiveFlag(null)} style={styles.backBtnTop}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.detailHeaderTitle}>REVIEW FLAG</Text>
                  <TouchableOpacity onPress={closeAll} style={styles.closeBtnTop}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.profileHeader}>
                  <Image 
                    source={{ uri: activeFlag.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${activeFlag.author?.full_name || 'U'}` }} 
                    style={styles.actionAvatar} 
                  />
                  <Text style={styles.actionName}>{activeFlag.author?.full_name || 'Unknown Author'}</Text>
                  <Text style={styles.actionUsername}>@{activeFlag.author?.username || 'user'}</Text>
                  <View style={[styles.badge, { backgroundColor: `${CATEGORY_COLORS[activeFlag.ai_category]}22` }]}>
                    <View style={[styles.badgeDot, { backgroundColor: CATEGORY_COLORS[activeFlag.ai_category] }]} />
                    <Text style={[styles.badgeText, { color: CATEGORY_COLORS[activeFlag.ai_category] }]}>
                      {CATEGORY_LABELS[activeFlag.ai_category] || 'Other'} · {Math.round((activeFlag.ai_confidence || 0) * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>CONTENT PREVIEW</Text>
                  <View style={styles.contentBox}>
                    <Text style={styles.contentText}>{activeFlag.content_preview || '(no text preview)'}</Text>
                  </View>
                </View>

                {activeFlag.ai_reason && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI REASONING</Text>
                    <View style={styles.aiReasonBox}>
                      <Ionicons name="sparkles" size={16} color="#6d7382" />
                      <Text style={styles.aiReasonText}>{activeFlag.ai_reason}</Text>
                    </View>
                  </View>
                )}

                {activeFlag.status === 'pending' && (
                  <View style={styles.actionWrap}>
                    <TouchableOpacity style={styles.btnApprove} onPress={approve} disabled={busy}>
                      <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                      <Text style={styles.btnApproveText}>APPROVE & KEEP POST</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnRemove} onPress={removeContent} disabled={busy}>
                      <Ionicons name="trash" size={22} color="#fff" />
                      <Text style={styles.btnRemoveText}>REMOVE POST</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnBan} onPress={banAuthor} disabled={busy}>
                      <Ionicons name="ban" size={22} color="#ef4444" />
                      <Text style={styles.btnBanText}>BAN USER</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : (
              /* LIST VIEW INSIDE DRAWER */
              <>
                <View style={styles.networkHeader}>
                  <Ionicons name={CATEGORIES.find(c => c.key === drawer)?.icon as any} size={56} color="#fff" style={{ marginBottom: 12 }} />
                  <Text style={styles.networkTitle}>{CATEGORIES.find(c => c.key === drawer)?.label}</Text>
                  <Text style={styles.networkSubtitle}>{drawerItems.length} flags to review</Text>
                  <TouchableOpacity onPress={closeAll} style={styles.closeBtnTop}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <View style={{ height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16, marginTop: 16 }} />

                <FlatList
                  data={drawerItems}
                  keyExtractor={(f) => f.id}
                  contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
                  ListEmptyComponent={<Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>Nothing here.</Text>}
                  renderItem={({ item: flag }) => (
                    <View style={styles.networkRow}>
                      <Image 
                        source={{ uri: flag.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${flag.author?.full_name || 'U'}` }} 
                        style={styles.networkAvatar} 
                      />
                      <View style={styles.networkTextWrap}>
                        <Text style={styles.networkName} numberOfLines={1}>{flag.author?.full_name || 'Unknown'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CATEGORY_COLORS[flag.ai_category] }} />
                          <Text style={styles.networkSub} numberOfLines={1}>
                            {CATEGORY_LABELS[flag.ai_category] || 'Other'} · {Math.round((flag.ai_confidence || 0) * 100)}%
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.followBtn}
                        onPress={() => setActiveFlag(flag)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.followBtnText}>Review</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hero: { paddingHorizontal: 16, paddingBottom: 20, backgroundColor: '#000' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent: { alignItems: 'center' },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },
  
  headerSection: { paddingHorizontal: 16, paddingVertical: 20 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  pageSub: { color: '#6d7382', fontSize: 13 },

  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 16 },
  iconWrap: { width: 40, alignItems: 'flex-start' },
  catLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' },
  catCount: { fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#000', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', minHeight: '40%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  
  networkHeader: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, position: 'relative' },
  networkTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  networkSubtitle: { color: '#6d7382', fontSize: 13, marginTop: 4 },
  closeBtnTop: { position: 'absolute', top: 0, right: 16, padding: 8, zIndex: 10 },
  backBtnTop: { position: 'absolute', top: 0, left: 16, padding: 8, zIndex: 10 },

  networkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  networkAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
  networkTextWrap: { flex: 1, justifyContent: 'center' },
  networkName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  networkSub: { color: '#6d7382', fontSize: 13 },
  followBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 10, position: 'relative' },
  detailHeaderTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },

  profileHeader: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  actionAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#ef4444', marginBottom: 16 },
  actionName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  actionUsername: { color: '#6d7382', fontSize: 14, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  contentBox: { padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  contentText: { color: '#fff', fontSize: 16, lineHeight: 26 },
  aiReasonBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  aiReasonText: { color: '#aab0bd', fontSize: 14, fontStyle: 'italic', flex: 1, lineHeight: 22 },

  actionWrap: { paddingHorizontal: 20, marginTop: 32, gap: 12 },
  btnApprove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#22c55e', padding: 18, borderRadius: 16 },
  btnApproveText: { color: '#22c55e', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  btnRemove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1f1f1f', padding: 18, borderRadius: 16 },
  btnRemoveText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  btnBan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#ef4444', padding: 18, borderRadius: 16 },
  btnBanText: { color: '#ef4444', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
