import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, Alert, TouchableOpacity, Modal, Keyboard, ScrollView, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { redis } from '../lib/redis';
import { useAuth } from '../context/AuthContext';
import UniversityPickerScreen from './UniversityPickerScreen';
import PostComposer from '../components/PostComposer';
import UploadReelModal from '../components/UploadReelModal';
import PostCard from '../components/PostCard';
import { StoriesCarousel } from '../components/StoriesCarousel';
import { fetchActiveStories, fetchMyStory } from '../lib/stories';
import CommentDrawer from '../components/CommentDrawer';
import { FlashList } from '@shopify/flash-list';
import LULogo from '../components/LULogo';
import FastButton from '../components/FastButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopNav from '../components/TopNav';

const FEED_DAYS = 30;
const POOL_SIZE = 150;

async function enrichPosts(rows: any[], myId: string) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const postIds = rows.map((p) => p.id);
  const authorIds = [...new Set(rows.map((p) => p.author_id).filter(Boolean))];

  const [authorsRes, mediaRes, reactionsRes, commentsRes, savedRes] = await Promise.all([
    authorIds.length > 0 ? supabase.from('profiles').select('id, full_name, avatar_url, is_verified, is_broadcast_only, is_bot, residence, university_id').in('id', authorIds) : Promise.resolve({ data: [] }),
    supabase.from('post_media').select('id, post_id, media_url, sort_order').in('post_id', postIds).order('sort_order'),
    supabase.from('reactions').select('id, post_id, user_id, reaction_type').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds).eq('is_deleted', false),
    myId ? supabase.from('saved_posts').select('post_id').in('post_id', postIds).eq('user_id', myId) : Promise.resolve({ data: [] }),
  ]);

  const authorMap: any = {};
  (authorsRes.data || []).forEach((a: any) => { authorMap[a.id] = a; });
  const mediaMap: any = {};
  (mediaRes.data || []).forEach((m: any) => { if (!mediaMap[m.post_id]) mediaMap[m.post_id] = []; mediaMap[m.post_id].push(m); });
  
  const upvotesMap: any = {};
  const downvotesMap: any = {};
  const myVoteMap: any = {};
  
  (reactionsRes.data || []).forEach((r: any) => {
    const type = r.reaction_type;
    if (type === 'up') upvotesMap[r.post_id] = (upvotesMap[r.post_id] || 0) + 1;
    else if (type === 'down') downvotesMap[r.post_id] = (downvotesMap[r.post_id] || 0) + 1;
    
    if (myId && r.user_id === myId) {
      myVoteMap[r.post_id] = type === 'up' ? 'up' : type === 'down' ? 'down' : null;
    }
  });

  const commentsMap: any = {};
  (commentsRes.data || []).forEach((c: any) => { commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1; });
  const savedSet = new Set();
  (savedRes.data || []).forEach((s: any) => savedSet.add(s.post_id));

  return rows.map((p) => ({
    ...p,
    profiles: authorMap[p.author_id] || null,
    post_media: mediaMap[p.id] || [],
    upvotes: upvotesMap[p.id] || 0,
    downvotes: downvotesMap[p.id] || 0,
    my_vote: myVoteMap[p.id] || null,
    saved: savedSet.has(p.id),
    comment_count: (commentsMap[p.id] || 0) + (p.bot_comment_count || 0),
  }));
}

async function fetchFeedData(myId: string, universityId: string | 'all' | 'mine', myUniversityId: string | undefined, residence?: string) {
  const cacheKey = `feed:${myId}:${universityId}:v2`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Serving feed from Redis cache (v2)');
      return cached as any[];
    }
  } catch (e) {
    console.log('Redis unavailable, falling back to database');
  }

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

  if (universityId === 'mine' && myUniversityId) {
    postsQuery = postsQuery.eq('university_id', myUniversityId);
  } else if (universityId !== 'all') {
    postsQuery = postsQuery.eq('university_id', universityId);
  }

  const [postsRes, connectionsRes, boostsRes, hiddenRes, blockedRes] = await Promise.all([
    postsQuery,
    supabase.from('connections').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${myId},receiver_id.eq.${myId}`),
    supabase.from('boosts').select('post_id, expires_at').eq('status', 'active'),
    supabase.from('hidden_posts').select('post_id').eq('user_id', myId),
    supabase.from('blocked_users').select('blocked_id').eq('blocker_id', myId), // 🔥 NEW
  ]);

  const hiddenIds = new Set((hiddenRes.data || []).map((h: any) => h.post_id));
  const blockedIds = new Set((blockedRes.data || []).map((b: any) => b.blocked_id)); // 🔥 NEW
  
  let rawPosts = Array.isArray(postsRes.data) 
    ? postsRes.data.filter((p: any) => !hiddenIds.has(p.id) && !blockedIds.has(p.author_id)) 
    : [];
  for (let i = rawPosts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rawPosts[i], rawPosts[j]] = [rawPosts[j], rawPosts[i]];
  }

  const friendIds = new Set((connectionsRes.data || []).map((c: any) => c.requester_id === myId ? c.receiver_id : c.requester_id));
  const now = Date.now();
  const boostedIds = new Set((boostsRes.data || []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now).map((b: any) => b.post_id));

  const enriched = await enrichPosts(rawPosts, myId);

  const scoredPosts = enriched.map((p: any) => {
    let score = 0;
    if (boostedIds.has(p.id)) score += 5000;
    if (friendIds.has(p.author_id)) score += 200;
    if (residence && p.profiles?.residence && p.profiles.residence.toLowerCase().includes(residence.toLowerCase())) score += 150;
    const ageHrs = (now - new Date(p.created_at).getTime()) / 3_600_000;
    if (ageHrs < 1) score += 300;
    else if (ageHrs < 6) score += 150;
    else if (ageHrs < 24) score += 80;
    else if (ageHrs < 72) score += 20;
    else score -= Math.min(500, ageHrs);
    score += Math.floor(Math.random() * 1000);
    return { ...p, _score: score };
  });

  scoredPosts.sort((a: any, b: any) => b._score - a._score);

  try {
    await redis.setex(cacheKey, 60, scoredPosts);
  } catch (e) {
    console.log('Redis SAVE ERROR:', (e as any)?.message || e);
  }

  return scoredPosts;
}

// 🔥 SKELETON COMPONENT
const SkeletonPost = () => (
  <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', backgroundColor: '#000' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f1f1f' }} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <View style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: '#1f1f1f', marginBottom: 6 }} />
        <View style={{ width: 80, height: 10, borderRadius: 4, backgroundColor: '#1f1f1f' }} />
      </View>
    </View>
    <View style={{ width: '90%', height: 14, borderRadius: 4, backgroundColor: '#1f1f1f', marginBottom: 6 }} />
    <View style={{ width: '60%', height: 14, borderRadius: 4, backgroundColor: '#1f1f1f', marginBottom: 12 }} />
    <View style={{ width: '100%', height: 240, borderRadius: 12, backgroundColor: '#1f1f1f', marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', gap: 20 }}>
      <View style={{ width: 40, height: 20, borderRadius: 4, backgroundColor: '#1f1f1f' }} />
      <View style={{ width: 40, height: 20, borderRadius: 4, backgroundColor: '#1f1f1f' }} />
      <View style={{ width: 40, height: 20, borderRadius: 4, backgroundColor: '#1f1f1f' }} />
    </View>
  </View>
);

export default function FeedScreen({ navigation, route }: any) {
  

  const { profile, reloadProfile, navType } = useAuth();

  useEffect(() => {
    if (profile && profile.approval_status === 'approved') {
      if (!profile.university_id || !profile.avatar_url || !profile.faculty || !profile.course || !profile.year_of_study) {
        reloadProfile();
      }
    }
  }, [profile]);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;

  const [activePost, setActivePost] = useState<any>(null);
  const [menuPost, setMenuPost] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [stickyPostId, setStickyPostId] = useState<string | null>(null);
  const [initialAnonymous, setInitialAnonymous] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [visibleCount, setVisibleCount] = useState(15);

  const [filterUniversity, setFilterUniversity] = useState<string>('all');
  const [filterLabel, setFilterLabel] = useState<string>('All Universities');
  const [showUniModal, setShowUniModal] = useState(false);

  // ADMIN STATES
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showReelUpload, setShowReelUpload] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState('');

  const checkAdminCode = () => {
    if (adminCode.trim().toUpperCase() === 'UUTK5A') {
      setShowAdminModal(false);
      setAdminCode('');
      setAdminError('');
      navigation.navigate('AdminDashboard');
    } else {
      setAdminError('Invalid secret code.');
    }
  };

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
    queryKey: ['feed', myId, filterUniversity],
    enabled: !!myId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData: any) => previousData,
    queryFn: () => fetchFeedData(myId!, filterUniversity, profile?.university_id, profile?.residence),
  });

  useEffect(() => { setVisibleCount(15); }, [filterUniversity]);

  const eventsQuery = useQuery({
    queryKey: ['events-horizontal'],
    enabled: !!myId,
    staleTime: 30000,
    queryFn: async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from('events').select('id, title, image_url, starts_at, location').gte('starts_at', threeDaysAgo).order('starts_at', { ascending: true }).limit(10);
      return data || [];
    },
  });

  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', myId],
    enabled: !!myId,
    staleTime: 60000,
    queryFn: async () => {
      const { data: conns } = await supabase.from('connections').select('requester_id, receiver_id').or(`requester_id.eq.${myId},receiver_id.eq.${myId}`);
      const excludeIds = new Set<string>([myId!]);
      (conns || []).forEach((c: any) => { excludeIds.add(c.requester_id); excludeIds.add(c.receiver_id); });
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, course, university_name, is_verified').eq('is_bot', false).eq('approval_status', 'approved').neq('id', myId).limit(30);
      return (data || []).filter((p: any) => !excludeIds.has(p.id)).slice(0, 8);
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['feed-leaderboard'],
    enabled: !!myId,
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await supabase.from('leaderboard_view').select('*').limit(1);
      return data?.[0] || null;
    },
  });

  const upcomingEvents = eventsQuery.data || [];
  const suggestions = suggestionsQuery.data || [];

  useFocusEffect(React.useCallback(() => { if (myId) feedQuery.refetch(); }, [myId]));

  const allPosts = feedQuery.data || [];
  const stickyPost = stickyPostId ? allPosts.find((p: any) => p.id === stickyPostId) : null;
  const otherPosts = stickyPostId ? allPosts.filter((p: any) => p.id !== stickyPostId) : allPosts;
  const posts = (stickyPost ? [stickyPost, ...otherPosts] : otherPosts).slice(0, visibleCount);
  
  // 🔥 FIXED LOADING LOGIC: Only show skeleton if we have NO data at all
  const isLoading = feedQuery.isLoading && posts.length === 0;
  const error = feedQuery.error?.message;

  const storiesQuery = useQuery({
    queryKey: ['stories', myId],
    enabled: !!myId,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const my = await fetchMyStory(myId!);
      const friends = await fetchActiveStories(myId!);
      return { my, friends };
    },
  });

  const myStories = storiesQuery.data?.my || [];
  const friendsStories = storiesQuery.data?.friends || [];


  const handlePostUpdate = useCallback((postId: string, updates: any) => {
    queryClient.setQueryData(['feed', myId, filterUniversity], (old: any) => Array.isArray(old) ? old.map((p: any) => p.id === postId ? { ...p, ...updates } : p) : old);
  }, [myId, filterUniversity, queryClient]);

  const handlePostDelete = useCallback((postId: string) => {
    queryClient.setQueryData(['feed', myId, filterUniversity], (old: any) => Array.isArray(old) ? old.filter((p: any) => p.id !== postId) : old);
  }, [myId, filterUniversity, queryClient]);

  const handleNewPost = async () => {
    setComposerOpen(false);
    await new Promise(r => setTimeout(r, 500));
    const { data } = await supabase.from('posts').select('id').eq('author_id', myId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data?.id) {
      setStickyPostId(data.id);
      const { data: fullPost } = await supabase.from('posts').select('*, post_media(*)').eq('id', data.id).maybeSingle();
      if (fullPost) {
        queryClient.setQueryData(['feed', myId, filterUniversity], (old: any) => {
          if (!Array.isArray(old)) return [fullPost];
          if (old.some((p: any) => p.id === fullPost.id)) return old;
          return [fullPost, ...old];
        });
      }
      setTimeout(async () => {
        setStickyPostId(null);
        await queryClient.invalidateQueries({ queryKey: ['feed', myId, filterUniversity] });
      }, 5000);
    } else {
      await queryClient.invalidateQueries({ queryKey: ['feed', myId, filterUniversity] });
    }
  };

  const refreshFeed = async () => {
    setVisibleCount(15);
    await queryClient.invalidateQueries({ queryKey: ['feed', myId, filterUniversity] });
    await feedQuery.refetch();
  };

  const selectMine = () => { setFilterUniversity('mine'); setFilterLabel('My University'); setVisibleCount(15); };
  const selectAll = () => { setFilterUniversity('all'); setFilterLabel('All Universities'); setVisibleCount(15); };

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

  const hidePost = async (post: any) => {
    setMenuPost(null);
    try {
      await supabase.from('hidden_posts').insert({ user_id: myId, post_id: post.id });
      queryClient.setQueryData(['feed', myId, filterUniversity], (old: any) => Array.isArray(old) ? old.filter((p: any) => p.id !== post.id) : old);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const renderPost = useCallback(({ item }: any) => (
    <PostCard
      post={item}
      onUpdate={handlePostUpdate}
      onDelete={handlePostDelete}
      onCommentOpen={(post: any) => setActivePost(post)}
      onMenu={(post: any) => setMenuPost(post)}
      onPress={() => navigation.navigate('PostDetail', { id: item.id })}
    />
  ), [handlePostUpdate, handlePostDelete, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>

      {/* HEADER */}
      <View style={[styles.stickyHeader, { paddingTop: Math.max(insets.top, 12), borderBottomWidth: 0, marginBottom: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LULogo size={36} animate={false} />
          <Text style={styles.brandText}>LU CONNECT</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {profile?.email === 'adminsammy@admin.com' ? (
            <TouchableOpacity onPress={() => setShowAdminModal(true)} style={{ padding: 4 }}>
              <Ionicons name="finger-print" size={26} color="#6d7382" />
            </TouchableOpacity>
          ) : null}
          <FastButton style={styles.plusBtn} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search" size={22} color="#fff" />
          </FastButton>
          <FastButton style={styles.plusBtn} onPress={() => setShowCreateMenu(true)}>
            <Ionicons name="add" size={26} color="#fff" />
          </FastButton>
        </View>
      </View>

      {navType === 'top' && <TopNav activeRoute="Feed" />}

      {/* FILTER BAR */}
      <View style={{ backgroundColor: '#000' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <FastButton style={[styles.filterPill, filterUniversity === 'mine' && styles.filterPillActive]} onPress={selectMine}>
            <Text style={[styles.filterText, filterUniversity === 'mine' && styles.filterTextActive]}>
              {profile?.university_name || 'My University'}
            </Text>
          </FastButton>
          <FastButton style={[styles.filterPill, filterUniversity === 'all' && styles.filterPillActive]} onPress={selectAll}>
            <Text style={[styles.filterText, filterUniversity === 'all' && styles.filterTextActive]}>
              🇰🇪 All Universities
            </Text>
          </FastButton>
          <FastButton
            style={[styles.filterPill, filterUniversity !== 'mine' && filterUniversity !== 'all' && styles.filterPillActive]}
            onPress={() => setShowUniModal(true)}
          >
            <Ionicons name="search" size={14} color={filterUniversity !== 'mine' && filterUniversity !== 'all' ? '#fff' : '#6d7382'} />
            <Text style={[styles.filterText, filterUniversity !== 'mine' && filterUniversity !== 'all' && styles.filterTextActive]}>
              {filterUniversity !== 'mine' && filterUniversity !== 'all' ? filterLabel : 'Browse...'}
            </Text>
          </FastButton>
        </ScrollView>
      </View>


      {/* TOP STORIES CAROUSEL */}
      

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </ScrollView>
      ) : error && posts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 12 }}>Failed to load feed</Text>
          <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 6 }}>{error}</Text>
          <FastButton onPress={refreshFeed} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></FastButton>
        </View>
      ) : (
        <FlashList
        ListHeaderComponent={<View style={{ paddingBottom: 10 }}><StoriesCarousel 
        myStories={myStories}
        friendsStories={friendsStories}
        onAddStory={() => navigation.navigate('StoryComposer')}
        onOpenMyStory={() => navigation.navigate('StoryViewer', { stories: myStories })}
        onOpenFriendStory={(stories: any) => navigation.navigate('StoryViewer', { stories })}
      /></View>}
          style={{ backgroundColor: '#000' }}
          data={posts}
          renderItem={({ item, index }: any) => {
            const showPeople = index === 2 || index === 10;
            const showEvents = index === 5 || index === 13;
            const showStoriesAgain = index === 8;
            return (
              <View style={{ backgroundColor: '#000' }}>
                {renderPost({ item, index })}
                
                {showStoriesAgain && (
                  <StoriesCarousel 
                    myStories={myStories}
                    friendsStories={friendsStories}
                    onAddStory={() => navigation.navigate('StoryComposer')}
                    onOpenMyStory={() => navigation.navigate('StoryViewer', { stories: myStories })}
                    onOpenFriendStory={(stories: any) => navigation.navigate('StoryViewer', { stories })}
                  />
                )}
                {showPeople && (
                  <View style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1f1f1f', marginVertical: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>People to Connect</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Connections')}>
                        <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>See All</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                      {suggestions.map((person: any) => (
                        <View key={person.id} style={{ width: 140, backgroundColor: '#0a0a0a', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1f1f1f' }}>
                          <Image source={{ uri: person.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${person.full_name}` }} style={{ width: '100%', height: 80 }} />
                          <View style={{ padding: 10, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{person.full_name}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Profile', { id: person.id })} style={{ backgroundColor: '#ef4444', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, marginTop: 8, width: '100%', alignItems: 'center' }}>
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Connect</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {showEvents && (
                  <View style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1f1f1f', marginVertical: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Events</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Events')}>
                        <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>See All</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                      {upcomingEvents.map((e: any) => (
                        <TouchableOpacity key={e.id} onPress={() => navigation.navigate('EventDetail', { id: e.id })} style={{ width: 200, backgroundColor: '#0a0a0a', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1f1f1f' }}>
                          <Image source={{ uri: e.image_url || 'https://via.placeholder.com/200x100' }} style={{ width: '100%', height: 100 }} />
                          <View style={{ padding: 10 }}>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{e.title}</Text>
                            <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 4 }}>{new Date(e.starts_at).toLocaleDateString()}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          }}
          keyExtractor={(item: any) => item.id}
          onEndReached={() => { if (visibleCount < allPosts.length) setVisibleCount(v => v + 15); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={40} color="#6d7382" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>Try switching to "All Universities" to see more.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={feedQuery.isRefetching} onRefresh={refreshFeed} tintColor="#ef4444" colors={['#ef4444']} progressBackgroundColor="#0a0a0a" />}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={15}
          removeClippedSubviews={false}
          updateCellsBatchingPeriod={50}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={visibleCount < allPosts.length ? (<View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color="#ef4444" /></View>) : allPosts.length > 0 ? (<Text style={{ textAlign: 'center', color: '#6d7382', padding: 20, fontSize: 13 }}>You're all caught up 🎉</Text>) : null}
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
            <PostComposer onPosted={handleNewPost} onClose={() => setComposerOpen(false)} initialAnonymous={initialAnonymous} />
          </View>
        </View>
      </Modal>

      {activePost ? <CommentDrawer post={activePost} onClose={() => setActivePost(null)} onPostUpdate={handlePostUpdate} /> : null}

      <Modal visible={!!menuPost} transparent animationType="fade" onRequestClose={() => setMenuPost(null)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuPost(null)}>
          <View style={styles.menuSheet}>
            {menuPost?.author_id === myId && (
              <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(menuPost)}>
                <Ionicons name="trash" size={20} color="#ef4444" />
                <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete Post</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => handleSave(menuPost)}>
              <Ionicons name={menuPost?.saved ? "bookmark" : "bookmark-outline"} size={20} color="#fff" />
              <Text style={styles.menuText}>{menuPost?.saved ? 'Unsave Post' : 'Save Post'}</Text>
            </TouchableOpacity>
            {menuPost?.author_id !== myId && (
              <TouchableOpacity style={styles.menuItem} onPress={() => hidePost(menuPost)}>
                <Ionicons name="eye-off" size={20} color="#fff" />
                <Text style={styles.menuText}>Hide Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showUniModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowUniModal(false)}>
        <UniversityPickerScreen
          onSelect={(item: any) => {
            setFilterUniversity(item.id);
            setFilterLabel(item.name);
            setVisibleCount(15);
            setShowUniModal(false);
          }}
          onClose={() => setShowUniModal(false)}
        />
      </Modal>


      <UploadReelModal visible={showReelUpload} onClose={() => setShowReelUpload(false)} onUploaded={() => {}} />

      {/* CREATE MENU */}
      <Modal visible={showCreateMenu} transparent animationType="slide" onRequestClose={() => setShowCreateMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-start' }} activeOpacity={1} onPress={() => setShowCreateMenu(false)}>
          <View style={{ backgroundColor: '#0a0a0a', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: insets.top + 20, paddingBottom: 30 }}>

            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 24, letterSpacing: 1 }}>CREATE</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 }}>

              {/* POST */}
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => { setShowCreateMenu(false); setComposerOpen(true); }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name="create" size={30} color="#3b82f6" />
                </View>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Post</Text>
              </TouchableOpacity>

              {/* REEL */}
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => { setShowCreateMenu(false); setShowReelUpload(true); }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(244,63,94,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name="videocam" size={30} color="#f43f5e" />
                </View>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Reel</Text>
              </TouchableOpacity>

              {/* EVENT */}
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => { setShowCreateMenu(false); navigation.navigate('Events'); }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name="calendar" size={30} color="#8b5cf6" />
                </View>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Event</Text>
              </TouchableOpacity>

              {/* ACADEMIC */}
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => { setShowCreateMenu(false); navigation.navigate('AcademicHub'); }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(234,179,8,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name="school" size={30} color="#eab308" />
                </View>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Academic</Text>
              </TouchableOpacity>

            </View>

            <View style={{ alignItems: 'center', marginTop: 30 }}>
               <TouchableOpacity onPress={() => setShowCreateMenu(false)} style={{ padding: 10 }}>
                 <Text style={{ color: '#6d7382', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
               </TouchableOpacity>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

      {/* ADMIN SECRET CODE MODAL */}
      <Modal visible={showAdminModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.adminModalContainer}>
          <ScrollView contentContainerStyle={styles.adminModalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={styles.logoWrapper}>
              <View style={styles.logoGlow} />
              <View style={styles.logoBox}>
                <Text style={styles.logoTextLU}>LU</Text>
              </View>
              <Text style={styles.logoTextConnect}>LU CONNECT</Text>
            </View>

            <View style={styles.adminDivider} />

            <View style={styles.adminProfileWrap}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.adminAvatar} />
              ) : (
                <View style={[styles.adminAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{profile?.full_name?.[0] || 'A'}</Text>
                </View>
              )}
              <Text style={styles.adminName}>{profile?.full_name || 'Admin'}</Text>
              <Text style={styles.adminRole}>SUPER ADMIN</Text>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.adminAccessTitle}>ADMIN ACCESS</Text>
              <Text style={styles.adminAccessSub}>Enter the secret code to unlock the hub.</Text>

              {adminError ? <Text style={styles.adminErrorText}>{adminError}</Text> : null}

              <TextInput
                style={styles.adminInput}
                placeholder="X X X X X X"
                placeholderTextColor="#1f1f1f"
                autoCapitalize="characters"
                maxLength={6}
                value={adminCode}
                onChangeText={(t) => setAdminCode(t.toUpperCase())}
              />

              <TouchableOpacity onPress={checkAdminCode} style={styles.adminUnlockBtn} activeOpacity={0.8}>
                <Text style={styles.adminUnlockText}>UNLOCK</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { setShowAdminModal(false); setAdminCode(''); setAdminError(''); }} style={styles.adminCancelBtn}>
              <Text style={styles.adminCancelText}>Cancel</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  adminModalContainer: { flex: 1, backgroundColor: '#000' },
  adminModalContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrapper: { alignItems: 'center', marginBottom: 30 },
  logoGlow: { position: 'absolute', top: 10, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239,68,68,0.2)' },
  logoBox: { width: 90, height: 90, borderRadius: 24, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 16 },
  logoTextLU: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 16, fontWeight: '800', letterSpacing: 4 },
  adminDivider: { width: '100%', height: 1, backgroundColor: '#1f1f1f', marginBottom: 30 },
  adminProfileWrap: { alignItems: 'center', marginBottom: 40 },
  adminAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#ef4444', marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#ef4444', fontSize: 32, fontWeight: '800' },
  adminName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  adminRole: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  inputWrap: { width: '100%', alignItems: 'center' },
  adminAccessTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  adminAccessSub: { color: '#6d7382', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  adminErrorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  adminInput: { backgroundColor: '#0a0a0a', color: '#ef4444', borderRadius: 16, borderWidth: 1, borderColor: '#1f1f1f', padding: 20, width: '100%', fontSize: 24, textAlign: 'center', letterSpacing: 12, marginBottom: 24 },
  adminUnlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#ef4444', width: '100%', padding: 18, borderRadius: 16 },
  adminUnlockText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  adminCancelBtn: { marginTop: 30, padding: 10 },
  adminCancelText: { color: '#6d7382', fontSize: 14, fontWeight: '600' },

  stickyHeader: {
    borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1f1f1f', zIndex: 100 },
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
