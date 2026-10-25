import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import VerifiedBadge from '../components/VerifiedBadge';

async function loadFriends(userId: string) {
  const [ownerRes, connsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, is_verified, is_broadcast_only').eq('is_bot', false).eq('id', userId).maybeSingle(),
    supabase.from('connections').select('id, requester_id, receiver_id, status, updated_at').or(`requester_id.eq.${userId},receiver_id.eq.${userId}`).eq('status', 'accepted').order('updated_at', { ascending: false }),
  ]);

  const owner = ownerRes.data;
  const conns = connsRes.data || [];
  const friendIds = conns.map((c: any) => (c.requester_id === userId ? c.receiver_id : c.requester_id));

  let friends: any[] = [];
  if (friendIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, year_of_study, is_verified, is_broadcast_only').eq('is_bot', false).in('id', friendIds);
    friends = profiles || [];
  }

  return { owner, friends };
}

export default function FriendsScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const { profile: me } = useAuth();
  const insets = useSafeAreaInsets();

  const friendsQuery = useQuery({
    queryKey: ['friends', userId],
    enabled: !!userId,
    staleTime: 60000,
    queryFn: () => loadFriends(userId),
  });

  const owner = friendsQuery.data?.owner || null;
  const friends = friendsQuery.data?.friends || [];
  const loading = friendsQuery.isLoading;

  if (loading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;
  if (!owner) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff' }}>Profile not found</Text></View>;

  const isMe = me?.id === userId;

  const renderFriend = ({ item: p }: any) => (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Profile', { id: p.id })}>
      <Image source={{ uri: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}` }} style={{ width: 56, height: 56, borderRadius: 28 }} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }} numberOfLines={1}>{p.full_name}</Text>
          {p.is_verified && <VerifiedBadge size={15} />}
        </View>
        <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>
          {p.year_of_study ? `Year ${p.year_of_study}` : 'Student'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar 
        title={isMe ? 'My Friends' : `${owner.full_name}'s Friends`}
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
        <Image source={{ uri: owner.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${owner.full_name}` }} style={{ width: 44, height: 44, borderRadius: 22 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{owner.full_name}</Text>
            {owner.is_verified && <VerifiedBadge size={14} />}
          </View>
          <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
          </Text>
        </View>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(p: any) => p.id}
        renderItem={renderFriend}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Ionicons name="people-outline" size={40} color="#6d7382" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 12 }}>No friends yet</Text>
            <Text style={{ fontSize: 13, color: '#6d7382', textAlign: 'center', marginTop: 6, maxWidth: 280 }}>
              {isMe ? 'Connect with people to see them here.' : `${owner.full_name} hasn't connected with anyone yet.`}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
});
