import React, { useState, useEffect } from 'react';
import PostCard from '../components/PostCard';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, Modal, Dimensions, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Modal, Share } from 'react-native';
import VerifiedBadge, { OfficialBadge } from '../components/VerifiedBadge';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const formatBirthday = (month: number, day: number) => {
  if (!month || !day) return null;
  return `${MONTHS[month - 1]} ${day}`;
};

// --- RIGHT SIDE DRAWER COMPONENT ---
function RightDrawer({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
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
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

async function loadProfileData(profileId: string) {
  const [profileRes, postsRes, connectionsRes, followersRes] = await Promise.all([
    supabase.from('profiles').select('*, roles(name)').eq('id', profileId).single(),
    supabase.from('posts').select('*, post_media(*)').eq('author_id', profileId).eq('is_deleted', false).eq('is_anonymous', false).order('created_at', { ascending: false }).limit(20),
    supabase.from('connections').select('*', { count: 'exact', head: true }).or(`and(requester_id.eq.${profileId},status.eq.accepted),and(receiver_id.eq.${profileId},status.eq.accepted)`),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);

  return {
    profile: profileRes.data,
    posts: postsRes.data || [],
    counts: {
      connections: connectionsRes.count || 0,
      realFollowers: followersRes.count || 0,
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
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [postsOpen, setPostsOpen] = useState(false);
  const [viewerTarget, setViewerTarget] = useState<any>(null); 

  const isMe = me?.id === targetId;
  const queryKey = ['profile', targetId];

  const profileQuery = useQuery({
    queryKey,
    enabled: !!targetId,
    staleTime: 60000,
    queryFn: () => loadProfileData(targetId),
  });

  const profile = profileQuery.data?.profile || null;
  const counts = profileQuery.data?.counts || { connections: 0, realFollowers: 0 };
  const loading = profileQuery.isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const pickAndUpload = async (type: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    
    setUploading(true);
    const file = result.assets[0];
    const ext = file.uri.split('.').pop();
    const path = `${me.id}/${type}-${Date.now()}.${ext}`;
    const bucket = type === 'avatar' ? 'avatars' : 'covers';

    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (upErr) {
      Alert.alert('Upload failed', upErr.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    const updateField = type === 'avatar' ? 'avatar_url' : 'cover_url';
    await supabase.from('profiles').update({ [updateField]: publicUrl }).eq('id', me.id);
    
    setUploading(false);
    setViewerTarget(null);
    await reloadProfile?.();
    invalidate();
  };

  // ─── Follow / Connect state ─────────────────────────────────────
  const [following, setFollowing] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [connectLoading, setConnectLoading] = React.useState(false);

  // Load current follow/connect status when viewing someone else's profile
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
      // Call create_dm RPC — it returns the conversation id or creates a new one
      const { data: convId, error } = await supabase.rpc('create_dm', { other_user_id: profile.id });
      if (error) throw error;
      if (!convId) throw new Error('Could not create conversation');
      navigation.navigate('Conversation', { id: convId });
    } catch (e: any) {
      Alert.alert('Message error', e.message);
    } finally {
      setConnectLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!me?.id || !profile?.id || connectLoading) return;
    setConnectLoading(true);
    try {
      if (following) {
        await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', profile.id);
        setFollowing(false);
      } else {
        await supabase.from('follows').insert({ follower_id: me.id, following_id: profile.id });
        setFollowing(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!me?.id || !profile?.id || connected || connectLoading) return;
    setConnectLoading(true);
    try {
      await supabase.from('connections').insert({ requester_id: me.id, receiver_id: profile.id, status: 'pending' });
      setConnected(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setConnectLoading(false);
    }
  };
  // ───────────────────────────────────────────────────────────────

  if (loading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;
  if (!profile) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff' }}>Profile not found</Text></View>;

  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}`;
  const totalFollowers = (counts.realFollowers || 0) + (profile.displayed_follower_count || 0);
  const birthday = formatBirthday(profile.birthday_month, profile.birthday_day);

  const details = [
    profile.faculty && { icon: 'school-outline', label: 'Faculty', value: profile.faculty },
    profile.course && { icon: 'book-outline', label: 'Course', value: profile.course },
    profile.year_of_study && { icon: 'calendar-outline', label: 'Year', value: `Year ${profile.year_of_study}` },
    profile.location && { icon: 'location-outline', label: 'Location', value: profile.location },
    profile.hometown && { icon: 'home-outline', label: 'Hometown', value: profile.hometown },
    profile.residence && { icon: 'bed-outline', label: 'Residence', value: profile.residence },
    profile.relationship_status && { icon: 'heart-outline', label: 'Relationship', value: profile.relationship_status },
    birthday && { icon: 'gift-outline', label: 'Birthday', value: birthday },
  ].filter(Boolean);

  const interests = profile.interests ? profile.interests.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const currentImageUrl = viewerTarget === 'cover' ? profile.cover_url : avatarUrl;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        
        {/* COVER */}
        <View style={styles.coverContainer}>
          <TouchableOpacity activeOpacity={1} onPress={() => { if (isMe) pickAndUpload('cover'); else if (profile.cover_url) setViewerTarget('cover'); }}>
            {profile.cover_url ? (
              <Image source={{ uri: profile.cover_url }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverImage, { backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }]}>
              {isMe && (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="camera" size={28} color="#6d7382" />
                  <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '600' }}>Tap to add cover</Text>
                </View>
              )}
            </View>
            )}
          </TouchableOpacity>
          
          {isMe && profile.cover_url && (
            <TouchableOpacity
              onPress={() => pickAndUpload('cover')}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Ionicons name="camera" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Change Cover</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* AVATAR + NAME */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setViewerTarget('avatar')} style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => isMe && pickAndUpload('avatar')} activeOpacity={0.85}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            </TouchableOpacity>
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6 }}>
            <Text style={styles.name}>{profile.full_name}</Text>
            {profile.is_verified && <VerifiedBadge size={20} />}
            {profile.is_broadcast_only && <Text style={{ fontSize: 16, marginLeft: 4 }}>📢</Text>}
            
            {profile.is_broadcast_only && <OfficialBadge size={14} />}
          </View>

          {!isMe && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity 
                style={[styles.pillPrimary, following && { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]}
                onPress={toggleFollow}
              >
                <Text style={[styles.pillPrimaryText, following && { color: '#ef4444' }]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.pillGhost, connected && { backgroundColor: '#141414', borderColor: '#6d7382' }]}
                onPress={handleConnect}
                disabled={connected || connectLoading}
              >
                <Text style={[styles.pillGhostText, connected && { color: '#6d7382' }]}>
                  {connectLoading ? 'Sending...' : connected ? 'Requested' : 'Connect'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.pillGhost, { backgroundColor: '#141414', borderColor: '#1f1f1f' }]}
                onPress={openConversation}
                disabled={connectLoading}
              >
                <Text style={[styles.pillGhostText, { color: '#fff' }]}>
                  {connectLoading ? '...' : 'Message'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.statsRow}>
            <Text style={styles.statText}>{counts.connections} connections</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>{totalFollowers.toLocaleString()} followers</Text>
          </View>

          <TouchableOpacity style={styles.moreBtn} onPress={() => setAboutOpen(true)}>
            <Text style={{ color: '#6d7382', fontSize: 14, fontWeight: '500' }}>More info</Text>
            <Ionicons name="chevron-forward" size={16} color="#6d7382" />
          </TouchableOpacity>
        </View>

        {/* POSTS PLACEHOLDER */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <TouchableOpacity style={styles.postsBtn} onPress={() => setPostsOpen(v => !v)}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Posts ({profileQuery.data?.posts.length || 0})</Text>
            <Ionicons name={postsOpen ? "chevron-up" : "chevron-down"} size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {postsOpen && profileQuery.data?.posts?.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {profileQuery.data.posts.map((p: any) => (
              <PostCard
                key={p.id}
                post={{ ...p, profiles: profile }}
                onUpdate={(postId, updates) => {
                  queryClient.setQueryData(queryKey, (old: any) => old ? { ...old, posts: old.posts.map((x: any) => x.id === postId ? { ...x, ...updates } : x) } : old);
                }}
                onDelete={(postId) => {
                  queryClient.setQueryData(queryKey, (old: any) => old ? { ...old, posts: old.posts.filter((x: any) => x.id !== postId) } : old);
                }}
                onCommentOpen={() => {}}
                onMenu={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* RIGHT DRAWER FOR ABOUT */}
      <RightDrawer open={aboutOpen} onClose={() => setAboutOpen(false)}>
        <View style={styles.drawerHeader}>
          <TouchableOpacity onPress={() => setAboutOpen(false)} style={{ padding: 4 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center', marginRight: 26 }}>About</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 20 }}>
            {/* REPLACED ICON WITH ACTUAL AVATAR */}
            <Image source={{ uri: avatarUrl }} style={styles.drawerAvatar} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
              <Text style={{ fontWeight: '700', fontSize: 18, color: '#fff' }}>{profile.full_name}</Text>
              {profile.is_verified && <VerifiedBadge size={16} />}
                
            </View>
            <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>Personal details shared on this profile</Text>

            <TouchableOpacity
              onPress={() => setQrModalVisible(true)}
              style={{ marginTop: 16, backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name="qr-code" size={20} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>My QR Code</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Activity</Text>
          <View style={{ paddingHorizontal: 20 }}>
            <InfoRow icon="people-outline" label="Connections" value={String(counts.connections)} />
            <InfoRow icon="heart-outline" label="Followers" value={totalFollowers.toLocaleString()} last />
          </View>

          {details.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Details</Text>
              <View style={{ paddingHorizontal: 20 }}>
                {details.map((d: any, i: number) => (
                  <InfoRow key={d.label} icon={d.icon} label={d.label} value={d.value} last={i === details.length - 1} />
                ))}
              </View>
            </>
          )}

          {interests.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Interests</Text>
              <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 20 }}>
                {interests.map((tag: string) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </RightDrawer>

      {/* FULL SCREEN IMAGE VIEWER */}
      <Modal visible={!!viewerTarget} transparent animationType="fade" onRequestClose={() => setViewerTarget(null)}>
        <View style={styles.viewerContainer}>
          
          <TouchableOpacity style={styles.viewerCloseBtn} onPress={() => setViewerTarget(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {currentImageUrl && (
            <Image source={{ uri: currentImageUrl }} style={styles.viewerImage} resizeMode="contain" />
          )}

          <View style={styles.viewerFooter}>
            {isMe ? (
              <TouchableOpacity style={styles.viewerPrimaryBtn} onPress={() => pickAndUpload(viewerTarget)} disabled={uploading}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.viewerPrimaryText}>{uploading ? 'Uploading...' : 'Change Photo'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.viewerPrimaryBtn} onPress={() => Alert.alert('Download', 'Download requires a native APK build and is not available in Expo Go.')}>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.viewerPrimaryText}>Download</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

function InfoRow({ icon, label, value, last }: any) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }]}>
      <Ionicons name={icon} size={20} color="#fff" style={{ width: 24 }} />
      <Text style={{ flex: 1, fontSize: 15, color: '#fff', marginLeft: 14 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: '#6d7382' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillBtnFollow: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  pillBtnConnect: { backgroundColor: 'transparent', borderColor: '#ef4444' },
  pillBtnFollowing: { backgroundColor: 'transparent', borderColor: '#ef4444' },
  pillBtnText: { fontSize: 13, fontWeight: '700' },
  coverContainer: { height: 200, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 40, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarSection: { paddingHorizontal: 16, marginTop: -50 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#000' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff' },
  officialBadge: { backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 10, fontWeight: '700', marginLeft: 6 },
  pillPrimary: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pillGhost: { borderWidth: 1.5, borderColor: '#1f1f1f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillGhostText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  statText: { fontSize: 13, color: '#6d7382' },
  statDot: { color: '#6d7382' },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 4 },
  postsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ef4444', borderRadius: 12, padding: 16 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, fontSize: 13, color: '#6d7382', fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  tagPill: { backgroundColor: '#141414', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  
  // Right Drawer Styles (Red line REMOVED)
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_W * 0.80,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    // borderLeftWidth: 2,  <--- REMOVED
    // borderLeftColor: '#ef4444', <--- REMOVED
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  drawerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ef4444',
  },
  
  // Fullscreen Viewer
  viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: SCREEN_W, height: SCREEN_H * 0.7 },
  viewerFooter: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  viewerPrimaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  viewerPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
