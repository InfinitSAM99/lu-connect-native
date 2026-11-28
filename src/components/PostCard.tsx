import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import VerifiedBadge from './VerifiedBadge';
import { tapLight, tapHeavy } from '../lib/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
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

export default function PostCard({ post, onUpdate, onCommentOpen, onMenu, onPress }: any) {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const isAnon = !!post?.is_anonymous;
  const author = isAnon ? { id: null, full_name: 'Anonymous Student', avatar_url: null, is_verified: false } : post?.profiles;
  const media = post?.post_media || [];
  
  // 🔥 FIXED: Combine real user actions with bot counts
  const totalComments = (post?.comment_count || 0) + (post?.bot_comment_count || 0);

  const [myVote, setMyVote] = useState<string | null>(post?.my_vote || null);
  const [upvotes, setUpvotes] = useState(post?.upvotes || 0);
  const [downvotes, setDownvotes] = useState(post?.downvotes || 0);
  const [expanded, setExpanded] = useState(false);
  
  const [aspectRatios, setAspectRatios] = useState<{ [key: string]: number }>({});

  const contentLong = (post?.content || '').length > COLLAPSE_CHAR_LIMIT;

  const upAnim = useRef(new Animated.Value(1)).current;
  const downAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 🔥 FIXED: Update state with combined counts
    if (post?.upvotes !== undefined || post?.bot_like_count !== undefined) {
      setUpvotes(post?.upvotes || 0);
    }
    if (post?.downvotes !== undefined) setDownvotes(post.downvotes);
    if (post?.my_vote !== undefined) setMyVote(post.my_vote);
    
    media.forEach((m: any) => {
      Image.getSize(m.media_url, (width, height) => {
        setAspectRatios(prev => ({ ...prev, [m.id]: width / height }));
      }, (err) => console.log('Failed to get image size', err));
    });
  }, [post?.upvotes, post?.downvotes, post?.my_vote, post?.bot_like_count, media]);

  const animateLike = () => {
    Animated.sequence([
      Animated.timing(upAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(upAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const animateDislike = () => {
    Animated.sequence([
      Animated.timing(downAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(downAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleVote = async (type: 'up' | 'down') => {
    if (!profile?.id) return;

    if (type === 'up') {
      tapLight();
      animateLike();
    } else {
      tapHeavy();
      animateDislike();
    }

    const isRemoving = myVote === type;
    const previousVote = myVote;
    const previousUp = upvotes;
    const previousDown = downvotes;

    // Local state updates (includes bots implicitly since `upvotes` state already has them)
    if (isRemoving) {
      setMyVote(null);
      if (type === 'up') setUpvotes(upvotes - 1);
      else setDownvotes(downvotes - 1);
    } else {
      setMyVote(type);
      if (type === 'up') {
        setUpvotes(upvotes + 1);
        if (previousVote === 'down') setDownvotes(downvotes - 1);
      } else {
        setDownvotes(downvotes + 1);
        if (previousVote === 'up') setUpvotes(upvotes - 1);
      }
    }

    try {
      if (previousVote) {
        await supabase.from('reactions').delete().match({ post_id: post.id, user_id: profile.id });
      }

      if (!isRemoving) {
        const { error } = await supabase.from('reactions').insert({
          post_id: post.id,
          user_id: profile.id,
          reaction_type: type
        });
        if (error && error.code !== '23505') throw error;

        if (type === 'up' && author?.id && author.id !== profile.id) {
          await supabase.from('notifications').insert({
            user_id: author.id,
            actor_id: profile.id,
            type: 'like',
            title: `${profile.full_name} liked your post`,
            link: `/posts/${post.id}`,
            reference_id: post.id,
          });
        }
      }
    } catch (e: any) {
      console.warn('Vote failed:', e);
      setMyVote(previousVote);
      setUpvotes(previousUp);
      setDownvotes(previousDown);
    }
  };

  const mediaCount = media.length;
  const gridItemSize = (SCREEN_W - 4) / 2;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={1} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => !isAnon && navigation.navigate('Profile', { id: post.author_id })}
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
        <TouchableOpacity activeOpacity={1} onPress={() => onMenu?.(post)} style={{ padding: 6, marginLeft: 'auto' }}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {!!post.content && (
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Text style={styles.content}>
            {renderTextWithMentions(contentLong && !expanded ? post.content.slice(0, COLLAPSE_CHAR_LIMIT) + '…' : post.content)}
          </Text>
          {contentLong && (
            <TouchableOpacity activeOpacity={1} onPress={() => setExpanded(!expanded)}>
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                {expanded ? 'See less' : 'See more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {mediaCount > 0 && (
        <View style={styles.mediaContainer}>
          {mediaCount === 1 && (() => {
            const ratio = aspectRatios[media[0].id];
            const displayHeight = ratio ? (SCREEN_W / ratio) : (SCREEN_W * 1.25); 
            return (
              <TouchableOpacity activeOpacity={1} onPress={() => onPress?.()}>
                <Image 
                  source={{ uri: media[0].media_url }} 
                  style={{ width: SCREEN_W, height: displayHeight }} 
                  resizeMode="contain" 
                  backgroundColor="#000" 
                />
              </TouchableOpacity>
            );
          })()}
          {mediaCount >= 2 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: SCREEN_W }}>
              {media.slice(0, 4).map((m: any) => (
                <TouchableOpacity activeOpacity={1} key={m.id} onPress={() => onPress?.()}>
                  <Image source={{ uri: m.media_url }} style={{ width: gridItemSize, height: gridItemSize }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity activeOpacity={1} onPress={() => handleVote('up')} style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Animated.View style={{ transform: [{ scale: upAnim }] }}>
            <ThumbsUp size={20} color={myVote === 'up' ? '#ef4444' : '#ffffff'} fill={myVote === 'up' ? '#ef4444' : 'transparent'} />
          </Animated.View>
          <Text style={{ color: myVote === 'up' ? '#ef4444' : '#ffffff', fontSize: 13, fontWeight: '600' }}>
            {upvotes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={1} onPress={() => handleVote('down')} style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Animated.View style={{ transform: [{ scale: downAnim }] }}>
            <ThumbsDown size={20} color={myVote === 'down' ? '#f59e0b' : '#ffffff'} fill={myVote === 'down' ? '#f59e0b' : 'transparent'} />
          </Animated.View>
          <Text style={{ color: myVote === 'down' ? '#f59e0b' : '#ffffff', fontSize: 13, fontWeight: '600' }}>
            {downvotes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={1} onPress={() => onCommentOpen?.(post)} style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Ionicons name="chatbubble-outline" size={22} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>
            {totalComments}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={1} style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' }]}>
          <Ionicons name="arrow-redo-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 16 }, 
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: 14, fontWeight: '600', color: '#fff' },
  time: { fontSize: 12, color: '#6d7382', marginTop: 2 },
  content: { fontSize: 15, color: '#fff', lineHeight: 22 },
  mediaContainer: { marginBottom: 10, marginHorizontal: -16, alignItems: 'center' }, 
  actions: { flexDirection: 'row', gap: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1f1f1f', marginTop: 4, paddingHorizontal: 16 },
  actionBtn: { padding: 4 },
});
