import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Share, Modal, Image, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

export default function TunnelsScreen({ navigation, route }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  // Create State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTunnelName, setNewTunnelName] = useState('');
  const [newTunnelRules, setNewTunnelRules] = useState('');
  const [allowPosts, setAllowPosts] = useState(true);
  const [allowVotes, setAllowVotes] = useState(true);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Join State
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const isAdmin = profile?.email === 'adminsammy@admin.com';

  // Handle deep link
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      const match = url.match(/join-tunnel\/([A-Z0-9]+)/i);
      if (match && match[1]) {
        const code = match[1].toUpperCase();
        // Verify tunnel exists before opening modal
        const { data } = await supabase.from('tunnels').select('id').eq('invite_code', code).maybeSingle();
        if (data) {
          setInviteCode(code);
          setJoinModalOpen(true);
        } else {
          Alert.alert('Invalid Link', 'This tunnel has been deleted or the invite expired.');
        }
      }
    };

    if (route.params?.prefilledCode) {
      setInviteCode(route.params.prefilledCode);
      setJoinModalOpen(true);
      navigation.setParams({ prefilledCode: undefined });
    }
    
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [route.params?.prefilledCode]);

  const { data: tunnels, isLoading } = useQuery({
    queryKey: ['my-tunnels', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      let query = supabase.from('tunnels').select('*, tunnel_members(count)');
      if (!isAdmin) {
        const { data: memberships } = await supabase.from('tunnel_members').select('tunnel_id').eq('user_id', profile!.id);
        const ids = (memberships || []).map(m => m.tunnel_id);
        if (ids.length === 0) return [];
        query = query.in('id', ids);
      }
      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
  });

  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled) return;
    setCoverImage(res.assets[0].uri);
  };

  const createTunnel = async () => {
    if (!newTunnelName.trim()) return Alert.alert('Error', 'Tunnel name is required.');
    setCreating(true);
    try {
      let finalCoverUrl = null;
      if (coverImage) {
        const ext = coverImage.split('.').pop() || 'jpg';
        const path = `tunnels/cover-${Date.now()}.${ext}`;
        const blob = await (await fetch(coverImage)).blob();
        const { error: upErr } = await supabase.storage.from('messages').upload(path, blob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('messages').getPublicUrl(path);
        finalCoverUrl = publicUrl;
      }

      const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase.from('tunnels').insert({
        name: newTunnelName.trim(),
        created_by: profile!.id,
        invite_code,
        cover_url: finalCoverUrl,
        rules: newTunnelRules.trim(),
        allow_posts: allowPosts,
        allow_votes: allowVotes,
      });
      
      if (error) throw error;
      setCreateModalOpen(false);
      setNewTunnelName(''); setNewTunnelRules(''); setCoverImage(null);
      queryClient.invalidateQueries({ queryKey: ['my-tunnels'] });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setCreating(false); }
  };

  const joinTunnel = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_tunnel_by_code', { p_invite_code: inviteCode.trim().toUpperCase() });
      if (error) throw error;
      Alert.alert('Success', `You joined "${data.name}"!`);
      setJoinModalOpen(false);
      setInviteCode('');
      queryClient.invalidateQueries({ queryKey: ['my-tunnels'] });
    } catch (e: any) {
      Alert.alert('Cannot join', e.message);
    } finally { setJoining(false); }
  };

  const leaveTunnel = (tunnel: any) => {
    Alert.alert('Leave Tunnel', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        await supabase.from('tunnel_members').delete().eq('tunnel_id', tunnel.id).eq('user_id', profile!.id);
        queryClient.invalidateQueries({ queryKey: ['my-tunnels'] });
      }},
    ]);
  };

  const deleteTunnel = (tunnel: any) => {
    Alert.alert('Delete Tunnel', 'This will permanently delete the tunnel and kick everyone out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('tunnels').delete().eq('id', tunnel.id);
        queryClient.invalidateQueries({ queryKey: ['my-tunnels'] });
      }},
    ]);
  };

  const rotateCode = async (tunnel: any) => {
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from('tunnels').update({ invite_code: newCode }).eq('id', tunnel.id);
    queryClient.invalidateQueries({ queryKey: ['my-tunnels'] });
    Alert.alert('New Code', newCode);
  };

  const shareTunnel = (tunnel: any) => {
    const url = Linking.createURL(`join-tunnel/${tunnel.invite_code}`);
    Share.share({ message: `Join my secret tunnel "${tunnel.name}" on LU Connect!\n\nTap here to join: ${url}` });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Tunnels" showBack={true} onBack={() => navigation.goBack()} />

      {/* Admin Create Button */}
      {isAdmin && (
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => setCreateModalOpen(true)} style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create a Tunnel</Text>
            <Ionicons name="add" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State for Users */}
      {!isAdmin && (!tunnels || tunnels.length === 0) ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="lock-closed" size={48} color="#ef4444" />
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>You are not in any Tunnel</Text>
          <Text style={{ color: '#6d7382', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
            Tunnels are secret. You must be invited by an admin and join using a link to access them.
          </Text>
          <TouchableOpacity onPress={() => setJoinModalOpen(true)} style={{ backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, marginTop: 32, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="key" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Enter Invite Code</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tunnels || []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('TunnelFeed', { tunnelId: item.id, tunnelName: item.name })} style={{ flex: 1, backgroundColor: '#0a0a0a', borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#1f1f1f' }}>
              {item.cover_url ? <Image source={{ uri: item.cover_url }} style={{ width: '100%', height: 120 }} /> : <View style={{ width: '100%', height: 120, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="lock-closed" size={32} color="#6d7382" /></View>}
              <View style={{ padding: 12 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: '#6d7382', fontSize: 11, marginTop: 4 }}>{item.tunnel_members?.[0]?.count || 0} members</Text>
                {isAdmin ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => rotateCode(item)}><Ionicons name="refresh" size={16} color="#6d7382" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => shareTunnel(item)}><Ionicons name="share-outline" size={16} color="#ef4444" /></TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => navigation.navigate('TunnelModeration', { tunnelId: item.id, tunnelName: item.name })}><Ionicons name="shield-checkmark" size={16} color="#f59e0b" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteTunnel(item)}><Ionicons name="trash" size={16} color="#ef4444" /></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => leaveTunnel(item)} style={{ marginTop: 12 }}>
                    <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '600' }}>Leave Tunnel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* CREATE TUNNEL MODAL (ADMIN FULL SCREEN) */}
      <Modal visible={createModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
            <TouchableOpacity onPress={() => setCreateModalOpen(false)}><Text style={{ color: '#6d7382', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>New Tunnel</Text>
            <TouchableOpacity onPress={createTunnel} disabled={creating || !newTunnelName.trim()}>
              <Text style={{ color: creating ? '#6d7382' : '#ef4444', fontSize: 16, fontWeight: '700' }}>{creating ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TouchableOpacity onPress={pickCover} style={{ height: 180, borderRadius: 16, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 20 }}>
              {coverImage ? <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} /> : <><Ionicons name="camera" size={40} color="#6d7382" /><Text style={{ color: '#6d7382', marginTop: 8, fontSize: 13 }}>Add Cover Image</Text></>}
            </TouchableOpacity>

            <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>TUNNEL NAME</Text>
            <TextInput style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, marginBottom: 20 }} placeholder="e.g. Conspiracy Theory" placeholderTextColor="#6d7382" value={newTunnelName} onChangeText={setNewTunnelName} />

            <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>RULES / DESCRIPTION</Text>
            <TextInput style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 }} placeholder="What is this tunnel about? What are the rules?" placeholderTextColor="#6d7382" value={newTunnelRules} onChangeText={setNewTunnelRules} multiline />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Allow Users to Post</Text>
                <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>Users can upload images and secrets</Text>
              </View>
              <Switch value={allowPosts} onValueChange={setAllowPosts} trackColor={{ true: '#ef4444' }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Enable Voting System</Text>
                <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>Users can upvote or downvote</Text>
              </View>
              <Switch value={allowVotes} onValueChange={setAllowVotes} trackColor={{ true: '#ef4444' }} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* JOIN TUNNEL MODAL */}
      <Modal visible={joinModalOpen} transparent animationType="slide" onRequestClose={() => setJoinModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 40 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Enter Invite Code</Text>
            <Text style={{ color: '#6d7382', fontSize: 14, marginBottom: 24 }}>Paste the code sent to you by the admin.</Text>
            <TextInput style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 20, textAlign: 'center', letterSpacing: 4, fontWeight: '700' }} placeholder="CODE123" placeholderTextColor="#6d7382" value={inviteCode} onChangeText={(v) => setInviteCode(v.toUpperCase())} autoCapitalize="characters" />
            <TouchableOpacity onPress={joinTunnel} disabled={joining || !inviteCode.trim()} style={{ backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16, opacity: joining || !inviteCode.trim() ? 0.5 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{joining ? 'Joining...' : 'Join Tunnel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setJoinModalOpen(false)} style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#6d7382', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
