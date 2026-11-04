import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import VerifiedBadge from './VerifiedBadge';
import { tapLight } from '../lib/haptics';
import { playLike } from '../lib/sounds';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_H_PADDING = 32;
const MEDIA_W = SCREEN_W - CARD_H_PADDING;
const COLLAPSE_CHAR_LIMIT = 280;

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

function renderTextWithMentions(text: string) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return <Text key={i} style={{ color: '#3b82f6', fontWeight: '600' }}>{part}</Text>;
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export default function PostCard({ post, onUpdate, onCommentOpen, onMenu }: any) {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const isAnon = !!post?.is_anonymous;
  const author = isAnon ? { id: null, full_name: 'Anonymous Student', avatar_url: null, is_verified: false } : post?.profiles;
  const media = post?.post_media || [];
  const liked = !!post?.liked;
  const likes = post?.like_count || 0;
  const comments = post?.comment_count || 0;
  const [localLiked, setLocalLiked] = useState(liked);
  const [localLikes, setLocalLikes] = useState(likes);
  const [expanded, setExpanded] = useState(false);
  const contentLong = (post?.content || '').length > COLLAPSE_CHAR_LIMIT;

  const toggleLike = async () => {
    tapLight();
    if (!profile?.id) return;

    const nextLiked = !localLiked;
    const nextLikes = localLikes + (nextLiked ? 1 : -1);

    setLocalLiked(nextLiked);
    setLocalLikes(nextLikes);
    onUpdate?.(post.id, { liked: nextLiked, like_count: nextLikes });

    try {
      if (nextLiked) {
        try { playLike(); } catch {}
        const { error } = await supabase.from('reactions').insert({ post_id: post.id, user_id: profile.id, reaction_type: 'like' });
        if (error && error.code !== '23505') {
          setLocalLiked(false);
          setLocalLikes(nextLikes - 1);
          onUpdate?.(post.id, { liked: false, like_count: nextLikes - 1 });
          return;
        }
        if (author?.id && author.id !== profile.id) {
          await supabase.from('notifications').insert({
            user_id: author.id, actor_id: profile.id, type: 'like',
            title: `${profile.full_name} liked your post`,
            link: `/posts/${post.id}`, reference_id: post.id,
          });
        }
      } else {
        await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', profile.id);
      }
    } catch (e) {
      console.warn('Like failed:', e);
    }
  };

  const mediaCount = media.length;
  const singleImageHeight = Math.min(MEDIA_W * 1.2, SCREEN_W * 0.95);
  const gridItemSize = (MEDIA_W - 4) / 2;

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => !isAnon && navigation.navigate('Profile', { id: post.author_id })}
          activeOpacity={0.7}
          disabled={isAnon}
        >
          {isAnon ? (
            <View style={[styles.avatar, { backgroundColor: '#1a0d2e', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="eye-off" size={20} color="#a855f7" />
            </View>
          ) : (
            <Image source={{ uri: author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${author?.full_name || 'U'}` }} style={styles.avatar} />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.name}>{isAnon ? 'Anonymous' : (author?.full_name || 'Student')}</Text>
              {author?.is_verified && <VerifiedBadge size={14} />}
              {author?.is_broadcast_only && <Ionicons name="megaphone" size={14} color="#ef4444" style={{ marginLeft: 2 }} />}
            </View>
            <Text style={styles.time}>{timeAgo(post.created_at)}{post.is_edited ? ' · edited' : ''}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onMenu?.(post)} style={{ padding: 6, marginLeft: 'auto' }}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {!!post.content && (
        <View style={{ paddingHorizontal: 4, marginBottom: 10 }}>
          <Text style={styles.content}>
            {renderTextWithMentions(contentLong && !expanded ? post.content.slice(0, COLLAPSE_CHAR_LIMIT) + '…' : post.content)}
          </Text>
          {contentLong && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                {expanded ? 'See less' : 'See more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MEDIA */}
      {mediaCount > 0 && (
        <View style={styles.mediaContainer}>
          {mediaCount === 1 && (
            <Image source={{ uri: media[0].media_url }} style={{ width: MEDIA_W, height: singleImageHeight, borderRadius: 12 }} resizeMode="cover" />
          )}
          {mediaCount >= 2 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: MEDIA_W }}>
              {media.slice(0, 4).map((m: any) => (
                <Image key={m.id} source={{ uri: m.media_url }} style={{ width: gridItemSize, height: gridItemSize, borderRadius: 8 }} resizeMode="cover" />
              ))}
            </View>
          )}
        </View>
      )}

      {/* COUNTS */}
      <View style={styles.countsRow}>
        <Text style={styles.countText}>{localLikes} {localLikes === 1 ? 'like' : 'likes'}</Text>
        <Text style={styles.countText}>{comments} {comments === 1 ? 'comment' : 'comments'}</Text>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
          <Ionicons name={localLiked ? 'heart' : 'heart-outline'} size={24} color={localLiked ? '#ef4444' : '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onCommentOpen?.(post)} style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="paper-plane-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: 14, fontWeight: '600', color: '#fff' },
  official: { marginLeft: 6, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, fontSize: 10, fontWeight: '700' },
  time: { fontSize: 12, color: '#6d7382', marginTop: 2 },
  content: { fontSize: 15, color: '#fff', lineHeight: 22 },
  mediaContainer: { marginBottom: 10, alignItems: 'flex-start' },
  countsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  countText: { fontSize: 12, color: '#6d7382' },
  actions: { flexDirection: 'row', gap: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  actionBtn: { padding: 4 },
});
