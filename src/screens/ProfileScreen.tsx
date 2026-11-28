import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, Modal, Dimensions, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerifiedBadge from '../components/VerifiedBadge';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PremiumAvatar, PremiumDiamond } from '../components/PremiumBadge';
import UserQRCode from '../components/UserQRCode';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const CELL_SIZE = Math.floor((SCREEN_W - (GRID_GAP * (NUM_COLUMNS + 1))) / NUM_COLUMNS);
const REEL_CELL_HEIGHT = Math.floor(CELL_SIZE * 1.4);

function formatViews(num: number) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function RightDrawer({ open, onClose, children }: any) {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_W)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 90, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_W, duration: 250, useNativeDriver: true })
      ]).start();
    }
  }, [open]);

  if (!open) return null;
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

async function loadProfileData(profileId: string) {
  const [profileRes, postsRes, reelsRes, connectionsRes, followersRes, followingRes, totalLikesRes] = await Promise.all([
    supabase.from('profiles').select('*, roles(name)').eq('id', profileId).single(),
    supabase.from('posts').select('*, post_media(*)').eq('author_id', profileId).eq('is_deleted', false).eq('is_anonymous', false).order('created_at', { ascending: false }).limit(20),
    supabase.from('reels').select('*').eq('user_id', profileId).order('created_at', { ascending: false }).limit(20),
    supabase.from('connections').select('*', { count: 'exact', head: true }).or(`and(requester_id.eq.${profileId},status.eq.accepted),and(receiver_id.eq.${profileId},status.eq.accepted)`),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
    supabase.from('hall_of_fame_winners').select('year').eq('user_id', profileId).order('year', { ascending: false })
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  return {
    profile: profileRes.data,
    posts: postsRes.data || [],
    reels: reelsRes.data || [],
    counts: {
      connections: connectionsRes.count || 0,
      realFollowers: followersRes.count || 0,
      following: followingRes.count || 0,
      totalLikes: totalLikesRes.data?.likes || 0,
      wins: totalLikesRes.data || [],
    },
  };
}

export default function ProfileScreen({ route, navigation }: any) {
  const targetId = route.params?.id;
  const { profile: me, reloadProfile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [uploading, setUploading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [viewerTarget, setViewerTarget] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const isMe = me?.id === targetId;
  const queryKey = ['profile', targetId];

  const profileQuery = useQuery({
    queryKey,
    enabled: !!targetId,
    staleTime: 0, refetchOnMount: 'always',
    queryFn: () => loadProfileData(targetId),
  });

  const profile = profileQuery.data?.profile || null;
  const reels = profileQuery.data?.reels || [];
  const counts = profileQuery.data?.counts || { connections: 0, realFollowers: 0, following: 0, totalLikes: 0, wins: [] };
  const loading = profileQuery.isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const pickAndUpload = async (type: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;

    setUploading(true);
    const file = result.assets[0];
    const ext = file.uri.split('.').pop() || 'jpg';
    const path = `${me.id}/${type}-${Date.now()}.${ext}`;
    const bucket = type === 'avatar' ? 'avatars' : 'covers';

    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      const updateField = type === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: dbErr } = await supabase.from('profiles').update({ [updateField]: publicUrl }).eq('id', me.id);
      if (dbErr) throw dbErr;

      queryClient.setQueryData(queryKey, (old: any) => old ? { ...old, profile: { ...old.profile, [updateField]: publicUrl } } : old);
      await reloadProfile?.();
    } catch (e: any) { Alert.alert('Upload failed', e.message); }
    finally { setUploading(false); setViewerTarget(null); }
  };

  const [following, setFollowing] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [connectLoading, setConnectLoading] = React.useState(false);

  React.useEffect(() => {
    if (!me?.id || !profile?.id || me.id === profile.id) return;
    (async () => {
      const [followRes, connectRes] = await Promise.all([
        supabase.from('follows').select('id').eq('follower_id', me.id).eq('following_id', profile.id).maybeSingle(),
        supabase.from('connections').select('id, status').or(`and(requester_id.eq.${me.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${me.id})`).maybeSingle(),
      ]);
      setFollowing(!!followRes.data);
      setConnected(!!connectRes.data);
    })();
  }, [me?.id, profile?.id]);

  const openConversation = async () => {
    if (!me?.id || !profile?.id || connectLoading) return;
    setConnectLoading(true);
    try {
      const { data: convId, error } = await supabase.rpc('create_dm', { other_user_id: profile.id });
      if (error) throw error;
      navigation.navigate('Conversation', { id: convId });
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setConnectLoading(false); }
  };

  const toggleFollow = async () => {
    if (!me?.id || !profile?.id || connectLoading) return;
    setConnectLoading(true);
    try {
      if (following) await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', profile.id);
      else await supabase.from('follows').insert({ follower_id: me.id, following_id: profile.id });
      setFollowing(!following);
      invalidate();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setConnectLoading(false); }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'post') await supabase.from('posts').delete().eq('id', deleteTarget.id);
      else await supabase.from('reels').delete().eq('id', deleteTarget.id);
      invalidate();
    } catch (e: any) { Alert.alert('Delete Failed', e.message); }
    finally { setDeleteTarget(null); }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;
  if (!profile) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff' }}>Profile not found</Text></View>;

  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}`;
  const totalFollowers = (counts.realFollowers || 0) + (profile.displayed_follower_count || 0);
  const details = [
    profile.faculty && { icon: 'school-outline', label: 'Faculty', value: profile.faculty },
    profile.course && { icon: 'book-outline', label: 'Course', value: profile.course },
    profile.year_of_study && { icon: 'calendar-outline', label: 'Year', value: `Year ${profile.year_of_study}` },
    profile.location && { icon: 'location-outline', label: 'Location', value: profile.location },
    profile.hometown && { icon: 'home-outline', label: 'Hometown', value: profile.hometown },
    profile.residence && { icon: 'bed-outline', label: 'Residence', value: profile.residence },
    profile.relationship_status && { icon: 'heart-outline', label: 'Relationship', value: profile.relationship_status },
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={styles.coverContainer}>
          <TouchableOpacity activeOpacity={1} onPress={() => { if (profile.cover_url) setViewerTarget('cover'); else if (isMe) pickAndUpload('cover'); }}>
            {profile.cover_url ? <Image source={{ uri: profile.cover_url }} style={styles.coverImage} /> : (
              <View style={[styles.coverImage, { backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }]}>
                {isMe && <View style={{ alignItems: 'center', gap: 6 }}><Ionicons name="camera" size={28} color="#6d7382" /><Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '600' }}>Tap to add cover</Text></View>}
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setViewerTarget('avatar')}>
            <PremiumAvatar avatarUrl={avatarUrl} fullName={profile.full_name} tier={profile.subscription_tier || 'free'} size={110} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6 }}>
            <Text style={styles.name}>{profile.full_name}</Text>
            {profile.is_verified && <VerifiedBadge size={20} />}
            {counts.wins?.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5C07B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 6 }}>
                <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>👑 {counts.wins[0].year}</Text>
              </View>
            )}
            <PremiumDiamond tier={profile.subscription_tier || 'free'} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingRight: 40 }}>
            <View style={{ alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{counts.following}</Text><Text style={{ color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginTop: 2 }}>Following</Text></View>
            <View style={{ alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{totalFollowers}</Text><Text style={{ color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginTop: 2 }}>Followers</Text></View>
            <View style={{ alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{formatViews(counts.totalLikes)}</Text><Text style={{ color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginTop: 2 }}>Likes</Text></View>
          </View>

          {!isMe && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={[styles.pillPrimary, following && { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]} onPress={toggleFollow}><Text style={[styles.pillPrimaryText, following && { color: '#ef4444' }]}>{following ? 'Following' : 'Follow'}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.pillGhost, connected && { backgroundColor: '#141414', borderColor: '#6d7382' }]} onPress={() => Alert.alert('Connect', 'Connect logic')}><Text style={[styles.pillGhostText, connected && { color: '#6d7382' }]}>{connectLoading ? 'Sending...' : connected ? 'Requested' : 'Connect'}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.pillGhost, { backgroundColor: '#141414', borderColor: '#1f1f1f' }]} onPress={openConversation} disabled={connectLoading}><Text style={[styles.pillGhostText, { color: '#fff' }]}>Message</Text></TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.moreBtn} onPress={() => setAboutOpen(true)}>
            <Text style={{ color: '#6d7382', fontSize: 14, fontWeight: '500' }}>More info</Text><Ionicons name="chevron-forward" size={16} color="#6d7382" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1f1f1f', marginTop: 16 }}>
          <TouchableOpacity style={[{ flex: 1, alignItems: 'center', paddingVertical: 14 }, activeTab === 'posts' && { borderBottomWidth: 2, borderBottomColor: '#ef4444' }]} onPress={() => setActiveTab('posts')}><Text style={{ color: activeTab === 'posts' ? '#fff' : '#6d7382', fontSize: 14, fontWeight: '700' }}>Posts ({profileQuery.data?.posts.length || 0})</Text></TouchableOpacity>
          <TouchableOpacity style={[{ flex: 1, alignItems: 'center', paddingVertical: 14 }, activeTab === 'reels' && { borderBottomWidth: 2, borderBottomColor: '#ef4444' }]} onPress={() => setActiveTab('reels')}><Text style={{ color: activeTab === 'reels' ? '#fff' : '#6d7382', fontSize: 14, fontWeight: '700' }}>Reels ({reels.length})</Text></TouchableOpacity>
        </View>

        {activeTab === 'posts' && (profileQuery.data?.posts?.length || 0) > 0 && (
          <View style={styles.grid}>
            {profileQuery.data!.posts.map((p: any) => (
              <TouchableOpacity key={p.id} style={styles.gridCell} onPress={() => navigation.navigate('PostDetail', { id: p.id })} onLongPress={() => isMe && setDeleteTarget({ type: 'post', id: p.id })}>
                {p.post_media?.length > 0 ? <Image source={{ uri: p.post_media[0].media_url }} style={styles.gridImage} resizeMode="cover" /> : <View style={[styles.gridImage, { backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="text" size={24} color="#6d7382" /></View>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'reels' && reels.length > 0 && (
          <View style={styles.grid}>
            {reels.map((r: any) => (
              <TouchableOpacity key={r.id} style={styles.reelCell} onPress={() => navigation.navigate('Video')} onLongPress={() => isMe && setDeleteTarget({ type: 'reel', id: r.id })}>
                <View style={styles.reelCellInner}>
                  {r.thumbnail_url ? <Image source={{ uri: r.thumbnail_url }} style={styles.gridImage} resizeMode="cover" /> : <View style={[styles.gridImage, { backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="play-circle" size={32} color="#6d7382" /></View>}
                  <View style={styles.reelOverlay}><Ionicons name="play" size={12} color="#fff" /><Text style={styles.reelOverlayText}>{formatViews(r.views_count)}</Text></View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <RightDrawer open={aboutOpen} onClose={() => setAboutOpen(false)}>
        <View style={styles.drawerHeader}>
          <TouchableOpacity onPress={() => setAboutOpen(false)} style={{ padding: 4 }}><Ionicons name="close" size={26} color="#fff" /></TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center', marginRight: 26 }}>About</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 20 }}>
            <PremiumAvatar avatarUrl={avatarUrl} fullName={profile.full_name} tier={profile.subscription_tier || 'free'} size={80} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
              <Text style={{ fontWeight: '700', fontSize: 18, color: '#fff' }}>{profile.full_name}</Text>
              {profile.is_verified && <VerifiedBadge size={16} />}
            </View>
          </View>
          <Text style={styles.sectionHeader}>MY QR CODE</Text>
          <View style={{ alignItems: 'center', paddingVertical: 10, marginBottom: 10 }}>
            <UserQRCode userId={profile.id} fullName={profile.full_name} avatarUrl={avatarUrl} />
          </View>
          <Text style={styles.sectionHeader}>Details</Text>
          <View style={{ paddingHorizontal: 20 }}>
            {details.map((d: any, i: number) => (
              <View key={d.label} style={[styles.infoRow, i !== details.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }]}>
                <Ionicons name={d.icon} size={20} color="#fff" style={{ width: 24 }} />
                <Text style={{ flex: 1, fontSize: 15, color: '#fff', marginLeft: 14 }}>{d.label}</Text>
                <Text style={{ fontSize: 14, color: '#6d7382' }}>{d.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </RightDrawer>

      <Modal visible={!!viewerTarget} transparent animationType="fade" onRequestClose={() => setViewerTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <View style={{ position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
            <TouchableOpacity onPress={() => setViewerTarget(null)} style={{ padding: 8 }}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
          </View>
          <Image source={{ uri: viewerTarget === 'cover' ? profile.cover_url : avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          {isMe && (
            <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' }}>
              <TouchableOpacity style={{ backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => pickAndUpload(viewerTarget === 'cover' ? 'cover' : 'avatar')}>
                <Ionicons name="camera" size={20} color="#fff" /><Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#141414', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Delete {deleteTarget?.type === 'post' ? 'Post' : 'Reel'}?</Text>
            <Text style={{ color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>This action cannot be undone.</Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#1f1f1f', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }} onPress={() => setDeleteTarget(null)}><Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }} onPress={executeDelete}><Text style={{ color: '#fff', fontWeight: '700' }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  coverContainer: { height: 200, position: 'relative' }, coverImage: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 40, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarSection: { paddingHorizontal: 16, marginTop: -50 },
  name: { fontSize: 22, fontWeight: '700', color: '#fff' },
  pillPrimary: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pillGhost: { borderWidth: 1.5, borderColor: '#1f1f1f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillGhostText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 4 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, fontSize: 13, color: '#6d7382', fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_GAP, paddingTop: GRID_GAP, gap: GRID_GAP },
  gridCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 4, overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%', borderRadius: 4 },
  reelCell: { width: CELL_SIZE, height: REEL_CELL_HEIGHT, borderRadius: 4, overflow: 'hidden' },
  reelCellInner: { width: '100%', height: '100%', backgroundColor: '#1f1f1f', position: 'relative' },
  reelOverlay: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  reelOverlayText: { color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  drawerContainer: { position: 'absolute', top: 0, right: 0, bottom: 0, width: SCREEN_W * 0.80, backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderBottomLeftRadius: 20, shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 20 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
});
