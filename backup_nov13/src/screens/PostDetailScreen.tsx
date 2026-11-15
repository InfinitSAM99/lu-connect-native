import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import CommentDrawer from '../components/CommentDrawer';
import TopBar from '../components/TopBar';

async function loadPost(postId: string, myId: string) {
  const { data, error } = await supabase.from('posts')
    .select('*, profiles:author_id(id, full_name, avatar_url, is_verified, is_broadcast_only, is_bot), post_media(*)')
    .eq('id', postId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.is_deleted) throw new Error('Post not found');

  const [reactionsRes, commentsRes, savedRes] = await Promise.all([
    supabase.from('reactions').select('id, post_id, user_id').eq('post_id', postId),
    supabase.from('comments').select('post_id').eq('post_id', postId).eq('is_deleted', false),
    myId ? supabase.from('saved_posts').select('post_id').eq('post_id', postId).eq('user_id', myId) : Promise.resolve({ data: [] }),
  ]);

  const liked = (reactionsRes.data || []).some((r) => r.user_id === myId);
  const saved = (savedRes.data || []).length > 0;

  return {
    ...data,
    like_count: (reactionsRes.data || []).length + (data.bot_like_count || 0),
    comment_count: (commentsRes.data || []).length + (data.bot_comment_count || 0),
    liked,
    saved,
  };
}

export default function PostDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;
  const [commentOpen, setCommentOpen] = useState(false);

  const postQuery = useQuery({
    queryKey: ['post', id],
    enabled: !!id && !!myId,
    staleTime: 60000,
    queryFn: () => loadPost(id, myId!),
  });

  const post = postQuery.data;
  const loading = postQuery.isLoading;
  const err = postQuery.error?.message;

  const handlePostUpdate = (postId: string, updates: any) => {
    queryClient.setQueryData(['post', id], (old: any) => old ? { ...old, ...updates } : old);
    queryClient.setQueryData(['feed', myId], (old: any) => {
      if (!old) return old;
      return old.map((p: any) => p.id === postId ? { ...p, ...updates } : p);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Post" showBack={true} onBack={() => navigation.goBack()} />

      {loading ? (
        <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} />
      ) : err ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 12 }}>{err}</Text>
          <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 6 }}>This post may have been deleted or the link is broken.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('Feed')}>
            <Text style={styles.retryText}>Go to Feed</Text>
          </TouchableOpacity>
        </View>
      ) : post ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
          <PostCard
            post={post}
            onUpdate={handlePostUpdate}
            onCommentOpen={() => setCommentOpen(true)}
            onMenu={() => {}}
          />
        </ScrollView>
      ) : null}

      {commentOpen && post && (
        <CommentDrawer post={post} onClose={() => setCommentOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  retryBtn: { marginTop: 16, backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
