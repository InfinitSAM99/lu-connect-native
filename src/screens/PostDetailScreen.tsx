import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CommentDrawer from '../components/CommentDrawer';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';

const { width: SCREEN_W } = Dimensions.get('window');

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

  if (postQuery.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#ef4444" size="large" style={{ marginTop: 50 }} />
      </View>
    );
  }

  if (postQuery.error || !postQuery.data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#ef4444', fontSize: 16 }}>Failed to load post.</Text>
        </View>
      </View>
    );
  }

  const post = postQuery.data;
  const media = post.post_media?.[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>POST</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* AUTHOR INFO */}
        <View style={styles.authorRow}>
          <Image source={{ uri: post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.full_name}` }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.authorName}>{post.profiles?.full_name || 'Student'}</Text>
              {post.profiles?.is_verified && <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />}
            </View>
            <Text style={styles.postTime}>{new Date(post.created_at).toLocaleDateString()}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* CAPTION */}
        {post.content ? (
          <Text style={styles.caption}>{post.content}</Text>
        ) : null}

        {/* FULL SCREEN MEDIA */}
        {media && (
          <Image 
            source={{ uri: media.media_url }} 
            style={{ width: SCREEN_W, height: SCREEN_W * 1.25, backgroundColor: '#111' }} 
            resizeMode="cover" 
          />
        )}

        {/* ACTIONS */}
        <View style={styles.actionRow}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ThumbsUp size={22} color="#fff" />
              <Text style={styles.actionText}>{post.like_count || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ThumbsDown size={22} color="#fff" />
              <Text style={styles.actionText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCommentOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>{post.comment_count || 0}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity>
            <Ionicons name="share-social-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {commentOpen && (
        <CommentDrawer post={post} onClose={() => setCommentOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  authorRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  authorName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  postTime: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  caption: { color: '#fff', fontSize: 15, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
