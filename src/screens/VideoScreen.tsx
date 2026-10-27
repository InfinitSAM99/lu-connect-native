import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import UploadReelModal from './UploadReelModal';
import CommentDrawer from '../components/CommentDrawer';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

async function loadReels(myId: string) {
  const { data, error } = await supabase
    .from('post_media')
    .select(`
      media_url,
      posts:post_id(
        id,
        content,
        created_at,
        author_id,
        bot_like_count,
        bot_comment_count,
        profiles:author_id(id, full_name, avatar_url)
      )
    `)
    .eq('media_type', 'video')
    .order('id', { ascending: false })
    .limit(20);

  if (error) throw error;

  const postIds = (data || []).map((row: any) => row.posts?.id).filter(Boolean);

  // Fetch real likes and comments
  const [likesRes, commentsRes, myLikesRes] = await Promise.all([
    supabase.from('reactions').select('post_id').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds).eq('is_deleted', false),
    supabase.from('reactions').select('post_id').eq('user_id', myId).in('post_id', postIds)
  ]);

  const likeCounts: any = {};
  (likesRes.data || []).forEach((r: any) => { likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1; });
  
  const commentCounts: any = {};
  (commentsRes.data || []).forEach((c: any) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });
  
  const myLikes = new Set((myLikesRes.data || []).map((r: any) => r.post_id));

  return (data || []).map((row: any) => ({
    id: row.posts.id,
    author_id: row.posts.author_id,
    video_url: row.media_url,
    caption: row.posts.content || '',
    author: row.posts.profiles || { full_name: 'Unknown', avatar_url: null },
    music: 'Original Audio',
    likes: (likeCounts[row.posts.id] || 0) + (row.posts.bot_like_count || 0),
    comments: (commentCounts[row.posts.id] || 0) + (row.posts.bot_comment_count || 0),
    liked: myLikes.has(row.posts.id),
  }));
}

function VideoItem({ item, isActive, onComment, navigation }: { item: any; isActive: boolean; onComment: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likes);
  const player = useVideoPlayer(item.video_url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  const toggleLike = async () => {
    if (!profile) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c: number) => c + (newLiked ? 1 : -1));

    if (newLiked) {
      await supabase.from('reactions').insert({ post_id: item.id, user_id: profile.id, reaction_type: 'like' });
    } else {
      await supabase.from('reactions').delete().eq('post_id', item.id).eq('user_id', profile.id);
    }
  };

  React.useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  return (
    <View style={[styles.videoContainer, { height: SCREEN_H }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View style={[styles.actions, { bottom: insets.bottom + 120 }]}>
        <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? '#ef4444' : '#fff'} />
          <Text style={styles.actionText}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onComment(item)} style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="paper-plane-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        {item.author_id === profile?.id && (
          <TouchableOpacity onPress={() => navigation.navigate('GetBoosted')} style={styles.actionBtn}>
            <Ionicons name="rocket-outline" size={28} color="#ef4444" />
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Boost</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.bottomInfo, { bottom: insets.bottom + 30 }]}>
        <View style={styles.authorRow}>
          <Image
            source={{ uri: item.author.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.author.full_name}` }}
            style={[styles.avatar, { backgroundColor: '#141414' }]}
          />
          <Text style={styles.authorName}>{item.author.full_name}</Text>
        </View>
        {item.caption ? <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text> : null}
        <View style={styles.musicRow}>
          <Ionicons name="musical-notes" size={14} color="#fff" />
          <Text style={styles.musicText} numberOfLines={1}>{item.music}</Text>
        </View>
      </View>
    </View>
  );
}

export default function VideoScreen() {
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [commentPost, setCommentPost] = useState<any>(null);
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const { data: reels, isLoading, refetch } = useQuery({
    queryKey: ['reels'],
    queryFn: loadReels,
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const items = reels || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }]}>
        <View style={{ width: 44 }} />
        <Text style={styles.headerTitle}>Reels</Text>
        <TouchableOpacity
          onPress={() => setUploadOpen(true)}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ef4444" />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="videocam-off" size={60} color="#6d7382" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>No reels yet</Text>
          <Text style={{ color: '#6d7382', fontSize: 13, textAlign: 'center', marginTop: 8 }}>Be the first to post a reel by tapping the + button</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <VideoItem item={item} isActive={index === activeIndex} onComment={setCommentPost} navigation={navigation} />}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_H}
          decelerationRate="fast"
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        />
      )}

      <UploadReelModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          refetch();
          setUploadOpen(false);
        }}
      />

      {commentPost && (
        <CommentDrawer
          open={!!commentPost}
          post={commentPost}
          onClose={() => {
            setCommentPost(null);
            refetch();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, alignItems: 'center', paddingBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  videoContainer: { width: SCREEN_W, justifyContent: 'flex-end' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 400 },
  actions: { position: 'absolute', right: 12, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bottomInfo: { position: 'absolute', left: 16, right: 90, gap: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#fff' },
  authorName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 18 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  musicText: { color: '#fff', fontSize: 12, flex: 1 },
});
