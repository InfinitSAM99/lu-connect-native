import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { tapLight, tapHeavy } from '../lib/haptics';
import CommentDrawer from '../components/CommentDrawer';

const { width: SCREEN_W } = Dimensions.get('window');

function timeAgo(date: string) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  if (s < 2592000) return Math.floor(s / 604800) + 'w';
  if (s < 31536000) return Math.floor(s / 2592000) + 'mo';
  return Math.floor(s / 31536000) + 'y';
}

export default function PostViewerScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState<any>(null);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*, post_media(*), profiles(id, full_name, avatar_url, is_verified)')
      .eq('id', postId)
      .single();
    
    if (error) {
      Alert.alert('Error', 'Failed to load post');
      navigation.goBack();
      return;
    }

    // Fetch reaction counts
    const { data: reactions } = await supabase
      .from('reactions')
      .select('user_id, reaction_type')
      .eq('post_id', postId)
      .is('comment_id', null);

    let up = 0, down = 0, myVote = null;
    (reactions || []).forEach((r: any) => {
      if (r.reaction_type === 'up') up++;
      else if (r.reaction_type === 'down') down++;
      if (r.user_id === profile?.id) myVote = r.reaction_type;
    });

    // Fetch comments count
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('is_deleted', false);

    setPost({
      ...data,
      upvotes: up + (data.bot_like_count || 0) + (data.like_count || 0),
      downvotes: down,
      my_vote: myVote,
      comment_count: count || 0,
    });
    setLoading(false);
  };

  const handlePostUpdate = (id: string, updates: any) => {
    if (post && post.id === id) {
      setPost((prev: any) => ({ ...prev, ...updates }));
    }
  };

  const handleVote = async (type: 'up' | 'down') => {
    if (!profile?.id || !post) return;
    if (type === 'up') tapLight(); else tapHeavy();

    const isRemoving = post.my_vote === type;
    const previousVote = post.my_vote;
    
    let newUp = post.upvotes;
    let newDown = post.downvotes;
    let newVote = type;

    if (isRemoving) {
      newVote = null;
      if (type === 'up') newUp -= 1;
      else newDown -= 1;
    } else {
      if (type === 'up') {
        newUp += 1;
        if (previousVote === 'down') newDown -= 1;
      } else {
        newDown += 1;
        if (previousVote === 'up') newUp -= 1;
      }
    }

    setPost((prev: any) => ({ ...prev, upvotes: newUp, downvotes: newDown, my_vote: newVote }));

    try {
      if (previousVote) await supabase.from('reactions').delete().match({ post_id: post.id, user_id: profile.id });
      if (!isRemoving) await supabase.from('reactions').insert({ post_id: post.id, user_id: profile.id, reaction_type: type });
    } catch (e) {
      console.warn('Vote failed', e);
      loadPost();
    }
  };

  if (loading || !post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ef4444" size="large" />
        </View>
      </View>
    );
  }

  const author = post.profiles;
  const media = post.post_media || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10 }}>
          <Image 
            source={{ uri: author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${author?.full_name || 'U'}` }} 
            style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ef4444' }} 
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{author?.full_name || 'Student'}</Text>
            <Text style={{ color: '#6d7382', fontSize: 12 }}>{timeAgo(post.created_at)}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={{ padding: 8 }}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {!!post.content && (
          <Text style={{ color: '#fff', fontSize: 16, lineHeight: 24, paddingHorizontal: 16, marginBottom: 16 }}>
            {post.content}
          </Text>
        )}

        {/* MEDIA */}
        {media.length > 0 && (
          <View style={{ width: SCREEN_W, height: SCREEN_W }}>
            <Image source={{ uri: media[0].media_url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        )}
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <TouchableOpacity onPress={() => handleVote('up')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThumbsUp size={24} color={post.my_vote === 'up' ? '#ef4444' : '#fff'} fill={post.my_vote === 'up' ? '#ef4444' : 'transparent'} />
            <Text style={{ color: post.my_vote === 'up' ? '#ef4444' : '#fff', fontSize: 14, fontWeight: '600' }}>{post.upvotes}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleVote('down')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThumbsDown size={24} color={post.my_vote === 'down' ? '#f59e0b' : '#fff'} fill={post.my_vote === 'down' ? '#f59e0b' : 'transparent'} />
            <Text style={{ color: post.my_vote === 'down' ? '#f59e0b' : '#fff', fontSize: 14, fontWeight: '600' }}>{post.downvotes}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActivePost(post)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{post.comment_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginLeft: 'auto' }}>
            <Ionicons name="arrow-redo-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {activePost && (
        <CommentDrawer 
          post={activePost} 
          onClose={() => setActivePost(null)} 
          onPostUpdate={handlePostUpdate} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#1f1f1f', paddingHorizontal: 16, paddingTop: 12 },
});
