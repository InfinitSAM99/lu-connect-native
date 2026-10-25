import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import VerifiedBadge from '../components/VerifiedBadge';

async function loadSavedPosts(userId: string) {
  // Join the post_media table to get the first image
  const { data, error } = await supabase
    .from('saved_posts')
    .select(`
      post_id, 
      posts:post_id(
        id, 
        content, 
        created_at, 
        post_media(media_url),
        profiles:author_id(id, full_name, avatar_url, is_verified)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => row.posts).filter(Boolean);
}

export default function SavedScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const queryKey = ['saved-posts', profile?.id];
  const { data: posts, isLoading, error } = useQuery({
    queryKey,
    enabled: !!profile?.id,
    queryFn: () => loadSavedPosts(profile.id),
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar 
        centeredHero 
        title="Saved" 
        subtitle="Posts you bookmarked" 
        showBack={false} 
        centerIcon={<Ionicons name="bookmark" size={72} color="#ef4444" />} 
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        {isLoading ? (
          <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle" size={40} color="#ef4444" />
            <Text style={styles.emptyTitle}>Failed to load</Text>
            <Text style={styles.emptySub}>{(error as any).message}</Text>
          </View>
        ) : !posts || posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bookmark-outline" size={40} color="#6d7382" />
            <Text style={styles.emptyTitle}>No saved posts</Text>
            <Text style={styles.emptySub}>Tap the bookmark icon on any post to save it here.</Text>
          </View>
        ) : (
          posts.map((post: any) => {
            // Get the first image from post_media if it exists
            const mediaUrl = post.post_media?.[0]?.media_url;

            return (
              <TouchableOpacity key={post.id} style={styles.card} onPress={() => navigation.navigate('PostDetail', { id: post.id })}>
                {/* Author Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Image source={{ uri: post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.full_name}` }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{post.profiles?.full_name || 'User'}</Text>
                    {post.profiles?.is_verified && <VerifiedBadge size={14} />}
                  </View>
                </View>

                {/* Post Content */}
                <Text style={{ color: '#aab0bd', fontSize: 14, lineHeight: 20 }} numberOfLines={3}>{post.content}</Text>
                
                {/* Post Media */}
                {mediaUrl && (
                  <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: 200, borderRadius: 10, marginTop: 10 }} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', padding: 40, backgroundColor: '#0a0a0a', borderRadius: 14, marginTop: 20, marginHorizontal: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#6d7382', marginTop: 4, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 12 },
});
