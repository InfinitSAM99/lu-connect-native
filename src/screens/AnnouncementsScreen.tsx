import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import TopBar from '../components/TopBar';

// Helper to color links blue in the preview
const renderPreviewText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return <Text key={index} style={{ color: '#3b82f6' }}>{part}</Text>;
    }
    return <Text key={index}>{part}</Text>;
  });
};

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

export default function AnnouncementsScreen({ navigation }: any) {
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
            <TouchableOpacity 
              key={a.id} 
              style={styles.feedItem} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AnnouncementDetail', { announcement: a })}
            >
              <View style={styles.imageContainer}>
                <Image 
                  source={require('../../assets/images/infinit_logo.png')} 
                  style={styles.coverImage} 
                  resizeMode="cover"
                />
                {a.is_pinned && (
                   <View style={styles.pinnedBadge}>
                     <Text style={styles.pinnedText}>PINNED</Text>
                   </View>
                )}
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.cardTitle} numberOfLines={2}>{a.title}</Text>
                
                {/* USE THE PREVIEW HELPER HERE */}
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {renderPreviewText(a.description)}
                </Text>
                
                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="person-circle-outline" size={16} color="#6d7382" />
                    <Text style={styles.authorText}>{a.profiles?.full_name || 'Admin'}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6d7382' }}>{new Date(a.published_at).toLocaleDateString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
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
  
  feedItem: { marginBottom: 24 },
  imageContainer: { position: 'relative', width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1f1f1f', marginBottom: 12 },
  coverImage: { width: '100%', height: '100%' },
  pinnedBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pinnedText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  
  textContainer: { paddingHorizontal: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6, lineHeight: 24 },
  cardDesc: { fontSize: 14, color: '#aab0bd', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorText: { fontSize: 13, color: '#fff', fontWeight: '600' },
});
