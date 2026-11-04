import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, Share, TextInput, 
  Modal, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { height: SCREEN_H } = Dimensions.get('window');

function formatNumber(num: number) {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function ReelItem({ item, isActive, navigation, onVideoEnd, onOpenComments }: any) {
  const { profile } = useAuth();
  const [liked, setLiked] = useState(item.is_liked || false);
  const [likes, setLikes] = useState(item.likes_count || 0);
  const [isFollowing, setIsFollowing] = useState(item.is_following || false);
  
  const [showEnd, setShowEnd] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3);
  const timerRef = useRef<any>(null);

  const player = useVideoPlayer(item.video_url, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive) {
      player.currentTime = 0;
      player.play();
      setShowEnd(false);
      
      // --- TRACK VIEW FOR DASHBOARD ---
      if (profile?.id) {
        supabase.from('reel_views').insert({ reel_id: item.id, viewer_id: profile.id })
          .then(({ error }) => { if(error) console.log("View tracking error:", error.message) });
      }
      
    } else {
      player.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isActive, player, profile?.id, item.id]);

  useEffect(() => {
    const endSub = player.addListener('playToEnd', () => {
      if (isActive) {
        setShowEnd(true);
        setTimeLeft(3);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              onVideoEnd();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    });
    return () => {
      endSub.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, player, onVideoEnd]);

  const saveVideo = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return alert('Need permission to save.');
      
      const fileUri = FileSystem.documentDirectory + 'saved-video.mp4';
      const { uri } = await FileSystem.downloadAsync(item.video_url, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      alert('Video saved to gallery!');
    } catch (e) {
      console.log(e);
      alert('Failed to save video.');
    }
  };

  
  const downloadVideo = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return alert('Permission needed to save video.');
      
      const fileUri = FileSystem.documentDirectory + `reel-${item.id}.mp4`;
      const { uri } = await FileSystem.downloadAsync(item.video_url, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      alert('Video downloaded to gallery!');
    } catch (e) {
      alert('Failed to download video.');
    }
  };

  const toggleLike = async () => {
    if (!profile?.id) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes(prev => prev + (nextLiked ? 1 : -1));

    try {
      if (nextLiked) {
        await supabase.from('reel_likes').insert({ reel_id: item.id, user_id: profile.id });
        await supabase.from('reels').update({ likes_count: likes + 1 }).eq('id', item.id);
      } else {
        await supabase.from('reel_likes').delete().match({ reel_id: item.id, user_id: profile.id });
        await supabase.from('reels').update({ likes_count: Math.max(0, likes - 1) }).eq('id', item.id);
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const toggleFollow = async () => {
    if (!profile?.id || profile.id === item.user_id) return;
    const nextFollow = !isFollowing;
    setIsFollowing(nextFollow);
    try {
      if (nextFollow) await supabase.from('follows').insert({ follower_id: profile.id, following_id: item.user_id });
      else await supabase.from('follows').delete().match({ follower_id: profile.id, following_id: item.user_id });
    } catch (error) { console.error("Error toggling follow:", error); }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out this reel by @${item.profiles?.full_name || 'Student'}!`, url: item.video_url });
    } catch (error) { console.error(error); }
  };

  return (
    <View style={{ height: SCREEN_H, width: '100%', backgroundColor: '#000' }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
      
      {showEnd && (
        <View style={styles.endScreenOverlay}>
          <Ionicons name="play-circle" size={80} color="#ef4444" />
          <Text style={styles.endText}>Next in {timeLeft}s</Text>
        </View>
      )}

      {/* Gradient only at the bottom to keep text readable */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} pointerEvents="none" />

      {/* RIGHT ACTION BAR */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={38} color={liked ? '#ef4444' : '#fff'} />
          <Text style={styles.actionText}>{formatNumber(likes)}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenComments(item)}>
          <Ionicons name="chatbubble-outline" size={34} color="#fff" />
          <Text style={styles.actionText}>{formatNumber(item.comments_count || 0)}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="arrow-redo-outline" size={36} color="#fff" />
          <Text style={styles.actionText}>{formatNumber(item.shares_count || 0)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="ellipsis-horizontal" size={30} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.smallAvatarContainer}>
          <Image source={{ uri: item.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.profiles?.full_name || 'User'}` }} style={styles.smallAvatar} />
        </View>
      </View>

      {/* BOTTOM INFO (Pushed down since there is no bottom nav) */}
      <View style={styles.bottomInfo}>
        <View style={styles.userRow}>
          <TouchableOpacity style={styles.userProfileLink} onPress={() => navigation.navigate('Profile', { id: item.user_id })}>
            <Image source={{ uri: item.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.profiles?.full_name || 'User'}` }} style={styles.avatar} />
            <Text style={styles.username}>{item.profiles?.full_name?.replace(/\s+/g, '').toLowerCase() || 'user'}_mfine</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.followBtn} onPress={toggleFollow}>
            <Text style={styles.followText}>{isFollowing ? 'Following' : 'Follow'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
      </View>
    </View>
  );
}

// --- COMMENT DRAWER COMPONENT ---
function CommentDrawer({ isVisible, onClose, reel, profile }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && reel) {
      loadComments();
    }
  }, [isVisible, reel]);

  const loadComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reel_comments')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('reel_id', reel.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
    setLoading(false);
  };

  const postComment = async () => {
    if (!newComment.trim() || !profile?.id) return;
    const commentText = newComment;
    setNewComment('');
    
    const tempComment = {
      id: Date.now().toString(),
      text: commentText,
      created_at: new Date().toISOString(),
      profiles: { full_name: profile.full_name, avatar_url: profile.avatar_url }
    };
    setComments(prev => [...prev, tempComment]);

    await supabase.from('reel_comments').insert({
      reel_id: reel.id,
      user_id: profile.id,
      text: commentText
    });
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.commentSheet}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentTitle}>{comments.length} comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.commentList}>
            {comments.map((c, index) => (
              <View key={c.id || index} style={styles.commentRow}>
                <Image source={{ uri: c.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.profiles?.full_name || 'U'}` }} style={styles.commentAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentUser}>{c.profiles?.full_name || 'User'}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.commentInputRow}>
            <Image source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'Me'}` }} style={styles.commentAvatar} />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#888"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity onPress={postComment}>
              <Text style={[styles.postBtn, { opacity: newComment.trim() ? 1 : 0.4 }]}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VideoScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  const [activeReelForComments, setActiveReelForComments] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('reels').select('*, profiles:user_id(full_name, avatar_url)').order('created_at', { ascending: false });
      if (data) setReels(data);
      setLoading(false);
    })();
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ReelItem 
            item={item} 
            isActive={index === activeIndex} 
            navigation={navigation} 
            onOpenComments={(reel: any) => setActiveReelForComments(reel)}
            onVideoEnd={() => {
              if (index < reels.length - 1) flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
            }} 
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
      />

      <CommentDrawer 
        isVisible={!!activeReelForComments} 
        onClose={() => setActiveReelForComments(null)} 
        reel={activeReelForComments} 
        profile={profile} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 250, zIndex: 5 },
  
  // Pushed up to leave space for phone navigation bar (Safe Area)
  rightActions: { position: 'absolute', right: 12, bottom: 80, alignItems: 'center', gap: 22, zIndex: 15 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  smallAvatarContainer: { marginTop: 10, padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  smallAvatar: { width: 28, height: 28, borderRadius: 6 },
  
  // Pushed down to the bottom of the screen
  bottomInfo: { position: 'absolute', bottom: 20, left: 16, right: 80, zIndex: 15 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  userProfileLink: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#fff' },
  username: { color: '#fff', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  followBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  followText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  
  endScreenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  endText: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 16 },

  // Comment Drawer Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  commentSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: SCREEN_H * 0.6 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  commentTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  commentList: { flex: 1, padding: 16 },
  commentRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentUser: { color: '#aaa', fontSize: 12, marginBottom: 2 },
  commentText: { color: '#fff', fontSize: 14 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#333', gap: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 16 },
  commentInput: { flex: 1, backgroundColor: '#333', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, color: '#fff', maxHeight: 100 },
  postBtn: { color: '#ef4444', fontWeight: '700', fontSize: 15 }
});
