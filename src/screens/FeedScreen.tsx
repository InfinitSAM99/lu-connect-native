import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert, TouchableOpacity, Modal, Keyboard, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import CommentDrawer from '../components/CommentDrawer';
import LULogo from '../components/LULogo';
import FastButton from '../components/FastButton';

const FEED_DAYS = 30;
const POOL_SIZE = 150;

async function enrichPosts(rows: any[], myId: string) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const postIds = rows.map((p) => p.id);
  const authorIds = [...new Set(rows.map((p) => p.author_id).filter(Boolean))];

  const [authorsRes, mediaRes, reactionsRes, commentsRes, savedRes] = await Promise.all([
    authorIds.length > 0 ? supabase.from('profiles').select('id, full_name, avatar_url, is_verified, is_broadcast_only, is_bot, residence, university_id').in('id', authorIds) : Promise.resolve({ data: [] }),
    supabase.from('post_media').select('id, post_id, media_url, sort_order').in('post_id', postIds).order('sort_order'),
    supabase.from('reactions').select('id, post_id, user_id').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds).eq('is_deleted', false),
    myId ? supabase.from('saved_posts').select('post_id').in('post_id', postIds).eq('user_id', myId) : Promise.resolve({ data: [] }),
  ]);

  const authorMap: any = {};
  (authorsRes.data || []).forEach((a: any) => { authorMap[a.id] = a; });
  const mediaMap: any = {};
  (mediaRes.data || []).forEach((m: any) => { if (!mediaMap[m.post_id]) mediaMap[m.post_id] = []; mediaMap[m.post_id].push(m); });
  const likesMap: any = {};
  const myLikes = new Set();
  (reactionsRes.data || []).forEach((r: any) => { likesMap[r.post_id] = (likesMap[r.post_id] || 0) + 1; if (myId && r.user_id === myId) myLikes.add(r.post_id); });
  const commentsMap: any = {};
  (commentsRes.data || []).forEach((c: any) => { commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1; });
  const savedSet = new Set();
  (savedRes.data || []).forEach((s: any) => savedSet.add(s.post_id));

  return rows.map((p) => ({
    ...p,
    profiles: authorMap[p.author_id] || null,
    post_media: mediaMap[p.id] || [],
    like_count: (likesMap[p.id] || 0) + (p.bot_like_count || 0),
    liked: myLikes.has(p.id),
    saved: savedSet.has(p.id),
    comment_count: (commentsMap[p.id] || 0) + (p.bot_comment_count || 0),
  }));
}

async function fetchFeedData(myId: string, universityId: string | 'all' | 'mine', myUniversityId: string | undefined, residence?: string) {
  const since = new Date(Date.now() - FEED_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let postsQuery = supabase
    .from('posts')
    .select('*')
    .eq('is_deleted', false)
    .neq('author_id', myId)
    .is('shared_post_id', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(POOL_SIZE);

  // Apply the University Filter
  if (universityId === 'mine' && myUniversityId) {
    postsQuery = postsQuery.eq('university_id', myUniversityId);
  } else if (universityId !== 'all') {
    postsQuery = postsQuery.eq('university_id', universityId);
  }

  const [postsRes, connectionsRes, boostsRes] = await Promise.all([
    postsQuery,
    supabase.from('connections').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${myId},receiver_id.eq.${myId}`),
    supabase.from('boosts').select('post_id, expires_at').eq('status', 'active'),
  ]);

  const rawPosts = Array.isArray(postsRes.data) ? postsRes.data : [];

  const friendIds = new Set((connectionsRes.data || []).map((c: any) => c.requester_id === myId ? c.receiver_id : c.requester_id));
  const now = Date.now();
  const boostedIds = new Set((boostsRes.data || []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now).map((b: any) => b.post_id));

  const enriched = await enrichPosts(rawPosts, myId);

  const scoredPosts = enriched.map((p: any) => {
    let score = 0;
    if (boostedIds.has(p.id)) score += 1000;
    if (friendIds.has(p.author_id)) score += 60;
    if (residence && p.profiles?.residence && p.profiles.residence.toLowerCase().includes(residence.toLowerCase())) score += 50;
    const ageHrs = (now - new Date(p.created_at).getTime()) / 3_600_000;
    if (ageHrs < 6) score += 30;
    else if (ageHrs < 24) score += 15;
    else if (ageHrs < 72) score += 5;
    score += Math.min(60, (p.like_count || 0) * 2);
    score += Math.min(60, (p.comment_count || 0) * 4);
    score += Math.floor(Math.random() * 50);
    return { ...p, _score: score };
  });

  scoredPosts.sort((a: any, b: any) => b._score - a._score);
  return scoredPosts;
}

export default function FeedScreen({ navigation, route }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;
  
  const [activePost, setActivePost] = useState<any>(null);
  const [menuPost, setMenuPost] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [initialAnonymous, setInitialAnonymous] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [visibleCount, setVisibleCount] = useState(15);

  // filterUniversity can be 'mine', 'all', or a UUID
  const [filterUniversity, setFilterUniversity] = useState<string>('mine');
  const [filterLabel, setFilterLabel] = useState<string>('My University');
  // Handle navigation params from Menu (e.g., Confessions -> open composer anonymously)
  useEffect(() => {
    if (route?.params?.openComposer) {
      setComposerOpen(true);
      if (route?.params?.anonymous) setInitialAnonymous(true);
      navigation.setParams({ openComposer: undefined, anonymous: undefined });
    }
  }, [route?.params?.openComposer]);


  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const feedQuery = useQuery({
    queryKey: ['feed', myId, filterUniversity], // Re-fetch when filter changes
    enabled: !!myId,
    staleTime: 60000,
    queryFn: () => fetchFeedData(myId!, filterUniversity, profile?.university_id, profile?.residence),
  });

  const allPosts = feedQuery.data || [];
  const posts = allPosts.slice(0, visibleCount);
  const loading = feedQuery.isLoading;
  const error = feedQuery.error?.message;

  const handlePostUpdate = useCallback((postId: string, updates: any) => {
    queryClient.setQueryData(['feed', myId, filterUniversity], (old: any) => Array.isArray(old) ? old.map((p: any) => p.id === postId ? { ...p, ...updates } : p) : old);
  }, [myId, filterUniversity, queryClient]);

  const handlePostDelete = useCallback((postId: string) => {
    queryClient.setQueryData(['feed', myId, filterUniversity], (old: any) => Array.isArray(old) ? old.filter((p: any) => p.id !== postId) : old);
  }, [myId, filterUniversity, queryClient]);

  const refreshFeed = () => {
    setVisibleCount(15);
    queryClient.invalidateQueries({ queryKey: ['feed', myId, filterUniversity] });
  };

  const selectMine = () => {
    setFilterUniversity('mine');
    setFilterLabel('My University');
    setVisibleCount(15);
  };

  const selectAll = () => {
    setFilterUniversity('all');
    setFilterLabel('All Universities');
    setVisibleCount(15);
  };

  const openPicker = () => {
    navigation.navigate('UniversityPicker', {
      onSelect: (name: string, id: string) => {
        setFilterUniversity(id);
        setFilterLabel(name);
        setVisibleCount(15);
      }
    });
  };

  const handleDelete = (post: any) => {
    setMenuPost(null);
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.rpc('soft_delete_post', { post_id: post.id });
          if (error) return Alert.alert('Error', error.message);
          handlePostDelete(post.id);
        }
      }
    ]);
  };

  const handleSave = async (post: any) => {
    setMenuPost(null);
    if (post.saved) {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', myId);
      handlePostUpdate(post.id, { saved: false });
    } else {
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: myId });
      handlePostUpdate(post.id, { saved: true });
    }
  };

  const renderPost = useCallback(({ item }: any) => (
    <PostCard
      post={item}
      onUpdate={handlePostUpdate}
      onDelete={handlePostDelete}
      onCommentOpen={(post: any) => setActivePost(post)}
      onMenu={(post: any) => setMenuPost(post)}
    />
  ), [handlePostUpdate, handlePostDelete]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      
      {/* HEADER */}
      <View style={[styles.stickyHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LULogo size={36} animate={false} />
          <Text style={styles.brandText}>LU CONNECT</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <FastButton style={styles.plusBtn} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search" size={22} color="#fff" />
          </FastButton>
          <FastButton style={styles.plusBtn} onPress={() => setComposerOpen(true)}>
            <Ionicons name="add" size={26} color="#fff" />
          </FastButton>
        </View>
      </View>

      {/* FILTER BAR */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f1f1f', backgroundColor: '#000' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <FastButton 
            style={[styles.filterPill, filterUniversity === 'mine' && styles.filterPillActive]} 
            onPress={selectMine}
          >
            <Text style={[styles.filterText, filterUniversity === 'mine' && styles.filterTextActive]}>
              {profile?.university_name || 'My University'}
            </Text>
          </FastButton>
          <FastButton 
            style={[styles.filterPill, filterUniversity === 'all' && styles.filterPillActive]} 
            onPress={selectAll}
          >
            <Text style={[styles.filterText, filterUniversity === 'all' && styles.filterTextActive]}>
              🇰🇪 All Universities
            </Text>
          </FastButton>
          <FastButton 
            style={[styles.filterPill, filterUniversity !== 'mine' && filterUniversity !== 'all' && styles.filterPillActive]} 
            onPress={openPicker}
          >
            <Ionicons name="search" size={14} color={filterUniversity !== 'mine' && filterUniversity !== 'all' ? '#fff' : '#6d7382'} />
            <Text style={[styles.filterText, filterUniversity !== 'mine' && filterUniversity !== 'all' && styles.filterTextActive]}>
              {filterUniversity !== 'mine' && filterUniversity !== 'all' ? filterLabel : 'Browse...'}
            </Text>
          </FastButton>
        </ScrollView>
      </View>

      {loading && posts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ef4444" size="large" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 12 }}>Failed to load feed</Text>
          <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 6 }}>{error}</Text>
          <FastButton onPress={refreshFeed} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></FastButton>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item: any) => item.id}
          onEndReached={() => {
            if (visibleCount < allPosts.length) setVisibleCount(v => v + 15);
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={40} color="#6d7382" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>Try switching to "All Universities" to see more.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshFeed} tintColor="#ef4444" />}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            visibleCount < allPosts.length ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#ef4444" />
              </View>
            ) : allPosts.length > 0 ? (
              <Text style={{ textAlign: 'center', color: '#6d7382', padding: 20, fontSize: 13 }}>You're all caught up 🎉</Text>
            ) : null
          }
        />
      )}

      {/* COMPOSER MODAL */}
      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', paddingBottom: keyboardHeight }}>
          <View style={{ backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>New Post</Text>
              <FastButton onPress={() => setComposerOpen(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </FastButton>
            </View>
            <PostComposer onPosted={() => { setComposerOpen(false); refreshFeed(); }} onClose={() => setComposerOpen(false)} initialAnonymous={initialAnonymous} />
          </View>
        </View>
      </Modal>

      {/* POST MENU */}
      {menuPost && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setMenuPost(null)}>
          <FastButton style={styles.menuOverlay} onPress={() => setMenuPost(null)}>
            <View style={styles.menuSheet}>
              <FastButton style={styles.menuItem} onPress={() => handleSave(menuPost)}>
                <Ionicons name="bookmark-outline" size={20} color="#fff" />
                <Text style={styles.menuText}>{menuPost.saved ? 'Unsave' : 'Save'}</Text>
              </FastButton>
              {menuPost.author_id === myId && (
                <>
                  <FastButton style={styles.menuItem} onPress={() => { setMenuPost(null); navigation.navigate('GetBoosted'); }}>
                    <Ionicons name="rocket-outline" size={20} color="#fff" />
                    <Text style={styles.menuText}>Boost this post</Text>
                  </FastButton>
                  <FastButton style={styles.menuItem} onPress={() => handleDelete(menuPost)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete post</Text>
                  </FastButton>
                </>
              )}
            </View>
          </FastButton>
        </Modal>
      )}

      {activePost && (
        <CommentDrawer post={activePost} onClose={() => setActivePost(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1f1f1f', zIndex: 100 },
  brandText: { fontSize: 26, fontWeight: '900', color: '#ef4444', letterSpacing: -1.2 },
  plusBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#141414', borderRadius: 20 },
  filterPillActive: { backgroundColor: '#ef4444' },
  filterText: { color: '#6d7382', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  emptyBox: { alignItems: 'center', padding: 40, marginHorizontal: 16, marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#6d7382', marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'stretch' },
  menuSheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  menuText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
