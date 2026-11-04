import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
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

export default function AdminModerationDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { flag } = route.params;
  const [busy, setBusy] = useState(false);

  const approve = () => {
    Alert.alert('Keep Post', 'Mark this as a false positive? The post stays up.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        setBusy(true);
        await supabase.from('moderation_flags').update({ status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', flag.id);
        setBusy(false); navigation.goBack();
      }}
    ]);
  };

  const removeContent = () => {
    Alert.alert('Remove Post', 'Hide this post from all users?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setBusy(true);
        await supabase.from('posts').update({ is_deleted: true }).eq('id', flag.content_id);
        await supabase.from('moderation_flags').update({ status: 'removed', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', flag.id);
        setBusy(false); navigation.goBack();
      }}
    ]);
  };

  const banAuthor = () => {
    if (!flag.author_id) return;
    Alert.alert('Ban User', `Ban ${flag.author?.full_name || 'this user'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ban', style: 'destructive', onPress: async () => {
        setBusy(true);
        await supabase.from('profiles').update({ approval_status: 'banned' }).eq('id', flag.author_id);
        await supabase.from('moderation_flags').update({ status: 'banned', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', flag.id);
        setBusy(false); navigation.goBack();
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REVIEW FLAG</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: flag.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${flag.author?.full_name || 'U'}` }} 
            style={styles.avatar} 
          />
          <Text style={styles.name}>{flag.author?.full_name || 'Unknown Author'}</Text>
          <Text style={styles.username}>@{flag.author?.username || 'user'}</Text>
          
          <View style={[styles.badge, { backgroundColor: `${CATEGORY_COLORS[flag.ai_category]}22` }]}>
            <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[flag.ai_category] }]} />
            <Text style={[styles.badgeText, { color: CATEGORY_COLORS[flag.ai_category] }]}>
              {CATEGORY_LABELS[flag.ai_category] || 'Other'} · {Math.round((flag.ai_confidence || 0) * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTENT PREVIEW</Text>
          <View style={styles.contentBox}>
            <Text style={styles.contentText}>{flag.content_preview || '(no text preview)'}</Text>
          </View>
        </View>

        {flag.ai_reason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI REASONING</Text>
            <View style={styles.aiReasonBox}>
              <Ionicons name="sparkles" size={16} color="#6d7382" />
              <Text style={styles.aiReasonText}>{flag.ai_reason}</Text>
            </View>
          </View>
        )}

        {flag.status === 'pending' && (
          <View style={styles.actionWrap}>
            <TouchableOpacity style={styles.btnApprove} onPress={approve} disabled={busy}>
              {busy ? <ActivityIndicator color="#22c55e" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                  <Text style={styles.btnApproveText}>APPROVE & KEEP POST</Text>
                </>
              )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  profileHeader: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#ef4444', marginBottom: 16 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  username: { color: '#6d7382', fontSize: 14, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  section: { marginTop: 24 },
  sectionTitle: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  contentBox: { padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  contentText: { color: '#fff', fontSize: 16, lineHeight: 26 },
  aiReasonBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  aiReasonText: { color: '#aab0bd', fontSize: 14, fontStyle: 'italic', flex: 1, lineHeight: 22 },

  actionWrap: { marginTop: 32, gap: 12 },
  btnApprove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#22c55e', padding: 18, borderRadius: 16 },
  btnApproveText: { color: '#22c55e', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  btnRemove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1f1f1f', padding: 18, borderRadius: 16 },
  btnRemoveText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  btnBan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#ef4444', padding: 18, borderRadius: 16 },
  btnBanText: { color: '#ef4444', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
