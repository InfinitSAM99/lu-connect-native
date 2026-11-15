import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import TopBar from '../components/TopBar';
import VerifiedBadge, { OfficialBadge } from '../components/VerifiedBadge';

async function loadAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);

  const authorIds = [...new Set((data || []).map((a) => a.author_id).filter(Boolean))];
  let authorMap: Record<string, any> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, is_verified, is_broadcast_only').eq('is_bot', false).in('id', authorIds);
    (profiles || []).forEach((p) => { authorMap[p.id] = p; });
  }

  return (data || []).map((a) => ({ ...a, profiles: authorMap[a.author_id] || null }));
}

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const queryKey = ['announcements'];
  const annQuery = useQuery({ queryKey, staleTime: 5 * 60 * 1000, queryFn: loadAnnouncements });

  const items = annQuery.data || [];
  const loading = annQuery.isLoading;
  const error = annQuery.error?.message || '';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        centeredHero
        title="Announcements"
        subtitle="Campus-wide updates from the administration"
        showBack={false}
        centerIcon={<Ionicons name="megaphone" size={72} color="#ef4444" />}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 + insets.bottom }}>
        {loading ? (
          <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle" size={40} color="#ef4444" />
            <Text style={styles.emptyTitle}>Failed to load</Text>
            <Text style={styles.emptySub}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="megaphone-outline" size={40} color="#6d7382" />
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            <Text style={styles.emptySub}>Check back later</Text>
          </View>
        ) : (
          items.map((a: any) => (
            <View key={a.id} style={styles.card}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {a.is_pinned && <View style={[styles.badge, { backgroundColor: '#ef4444' }]}><Text style={styles.badgeText}>PINNED</Text></View>}
                {a.is_important && !a.is_pinned && <View style={[styles.badge, { backgroundColor: '#f59e0b' }]}><Text style={styles.badgeText}>IMPORTANT</Text></View>}
              </View>

              <Text style={styles.cardTitle}>{a.title}</Text>
              {a.image_url && <Image source={{ uri: a.image_url }} style={styles.cardImage} resizeMode="cover" />}
              <Text style={styles.cardDesc}>{a.description}</Text>

              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {a.profiles?.avatar_url && <Image source={{ uri: a.profiles.avatar_url }} style={{ width: 18, height: 18, borderRadius: 9 }} />}
                  
                  {/* NAME + BADGES */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={styles.authorText}>{a.profiles?.full_name || 'Admin'}</Text>
                    {a.profiles?.is_verified && <VerifiedBadge size={14} />}
                    {a.profiles?.is_broadcast_only && <Text style={{ fontSize: 12, marginLeft: 4 }}>📢</Text>}
                    {a.profiles?.is_broadcast_only && <Text style={{ fontSize: 12, marginLeft: 4 }}>📢</Text>}
                    
                    {a.profiles?.is_broadcast_only && <OfficialBadge size={14} />}
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#6d7382' }}>{new Date(a.published_at).toLocaleDateString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', padding: 40, backgroundColor: '#0a0a0a', borderRadius: 14, marginTop: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#6d7382', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 8 },
  cardImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 12 },
  cardDesc: { fontSize: 14, color: '#aab0bd', lineHeight: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  authorText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
});
