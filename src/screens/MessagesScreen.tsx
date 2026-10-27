import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ScrollView, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomSheet from '../components/BottomSheet';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';
import AppButton from '../components/AppButton';

const ONLINE_WINDOW_MS = 60 * 1000;
function isRecent(date: string | null) {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < ONLINE_WINDOW_MS;
}

async function loadConversations(profileId: string) {
  const { data: members, error } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at, conversations(id, is_group, name, updated_at)')
    .eq('user_id', profileId);
  if (error) throw new Error(error.message);

  const convIds = (members || []).map((m: any) => m.conversation_id);
  if (convIds.length === 0) return [];

  const [otherMembersRes, recentMsgsRes, groupsRes] = await Promise.all([
    supabase.from('conversation_members').select('conversation_id, user_id').in('conversation_id', convIds).neq('user_id', profileId),
    supabase.from('messages').select('conversation_id, content, created_at, sender_id, is_deleted').in('conversation_id', convIds).eq('is_deleted', false).order('created_at', { ascending: false }).limit(500),
    supabase.from('groups').select('id, name, cover_url, member_count, conversation_id').in('conversation_id', convIds),
  ]);

  const otherUserIds = [...new Set((otherMembersRes.data || []).map((r: any) => r.user_id))];
  const { data: profiles } = otherUserIds.length > 0 ? await supabase.from('profiles').select('id, full_name, avatar_url, last_seen').in('id', otherUserIds) : { data: [] };
  const profileMap: any = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

  const otherByConv: any = {};
  (otherMembersRes.data || []).forEach((row: any) => {
    if (!otherByConv[row.conversation_id] && profileMap[row.user_id]) otherByConv[row.conversation_id] = profileMap[row.user_id];
  });

  const groupByConv: any = {};
  (groupsRes.data || []).forEach((g: any) => { groupByConv[g.conversation_id] = g; });

  const lastByConv: any = {};
  const unreadByConv: any = {};
  (recentMsgsRes.data || []).forEach((msg: any) => { if (!lastByConv[msg.conversation_id]) lastByConv[msg.conversation_id] = msg; });

  members.forEach((m: any) => {
    const lastReadTs = m.last_read_at ? new Date(m.last_read_at).getTime() : 0;
    let count = 0;
    (recentMsgsRes.data || []).forEach((msg: any) => {
      if (msg.conversation_id !== m.conversation_id) return;
      if (msg.sender_id === profileId) return;
      if (new Date(msg.created_at).getTime() <= lastReadTs) return;
      count++;
    });
    unreadByConv[m.conversation_id] = count;
  });

  const result = members.map((m: any) => ({
    ...m.conversations,
    conversation_id: m.conversation_id,
    other: otherByConv[m.conversation_id] || null,
    last: lastByConv[m.conversation_id] || null,
    unreadCount: unreadByConv[m.conversation_id] || 0,
    isOnline: otherByConv[m.conversation_id] ? isRecent(otherByConv[m.conversation_id].last_seen) : false,
    group: groupByConv[m.conversation_id] || null,
  })).sort((a: any, b: any) => {
    const aTime = new Date(a.last?.created_at || a.updated_at || 0).getTime();
    const bTime = new Date(b.last?.created_at || b.updated_at || 0).getTime();
    return bTime - aTime;
  });

  return result;
}

export default function MessagesScreen({ navigation }: any) {
  const { profile } = useAuth();
  const myId = profile?.id;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [menuConv, setMenuConv] = useState<any>(null);
  const [errMsg, setErrMsg] = useState('');
  const readChatsRef = useRef<Set<string>>(new Set());
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    if (!myId) return;
    supabase.from('connections')
      .select('receiver_id, requester_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${myId},receiver_id.eq.${myId}`)
      .then(async ({ data }) => {
        if (!data) return;
        const friendIds = data.map((c: any) => c.requester_id === myId ? c.receiver_id : c.requester_id);
        if (friendIds.length === 0) return;
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', friendIds);
        setFriends(profiles || []);
      });
  }, [myId]);

  const convsQuery = useQuery({
    queryKey: ['convs', myId],
    enabled: !!myId,
    queryFn: () => loadConversations(myId!),
  });

  useFocusEffect(
    useCallback(() => {
      if (myId) {
        queryClient.invalidateQueries({ queryKey: ['convs', myId] });
      }
    }, [myId, queryClient])
  );

  // Realtime listener for instant updates
  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel(`msgs-${myId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['convs', myId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, () => {
        queryClient.invalidateQueries({ queryKey: ['convs', myId] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['convs', myId] });
      });

    const timer = setTimeout(() => ch.subscribe(), 100);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [myId, queryClient]);

  const conversations = convsQuery.data || [];
  // Override unread counts for chats we already opened in this session
  const conversationsWithReadStatus = conversations.map((c: any) => ({
    ...c,
    unreadCount: readChatsRef.current.has(c.conversation_id) ? 0 : c.unreadCount
  }));

  const filtered = search.trim()
    ? conversationsWithReadStatus.filter((c: any) => {
        const name = c.group?.name || c.other?.full_name || '';
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : conversationsWithReadStatus;

  const openChat = (conv: any) => {
    // 1. Instantly remove the badge locally in the cache
    queryClient.setQueryData(['convs', myId], (old: any) => {
      if (!old) return old;
      return old.map((c: any) => 
        c.conversation_id === conv.conversation_id ? { ...c, unreadCount: 0 } : c
      );
    });
    
    // 2. Navigate
    readChatsRef.current.add(conv.conversation_id);
    navigation.navigate('Conversation', { id: conv.conversation_id });
  };

  const handleDelete = async (c: any) => {
    Alert.alert('Delete conversation', 'It will be removed from your chat list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('conversation_members').delete().eq('conversation_id', c.conversation_id).eq('user_id', profile!.id);
          setMenuConv(null);
          convsQuery.refetch();
        }
      }
    ]);
  };

  if (convsQuery.isLoading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 }}>Messages</Text>
        <TouchableOpacity onPress={() => setSearchMode(!searchMode)} style={{ padding: 4 }}>
          <Ionicons name="search" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {searchMode && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
          <TextInput
            placeholder="Search messages"
            placeholderTextColor="#6d7382"
            value={search}
            onChangeText={setSearch}
            style={{ backgroundColor: '#141414', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#fff' }}
            autoFocus
          />
        </View>
      )}

      {errMsg ? <Text style={{ color: '#ef4444', padding: 16 }}>{errMsg}</Text> : null}

      {friends.length > 0 && !searchMode && (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
          <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 }}>FRIENDS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
            {friends.map((f: any) => (
              <TouchableOpacity key={f.id} onPress={() => navigation.navigate('Profile', { id: f.id })} style={{ alignItems: 'center', width: 64 }}>
                <Image source={{ uri: f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.full_name}` }} style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 6 }} />
                <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={1}>{f.full_name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.conversation_id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }: any) => {
          const title = item.group?.name || item.other?.full_name || 'Unknown';
          const avatar = item.group?.cover_url || item.other?.avatar_url;
          const initials = title.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase();
          const lastText = item.last?.content || (item.last?.is_deleted ? 'Message deleted' : 'No messages yet');
          return (
            <TouchableOpacity
              onPress={() => openChat(item)}
              onLongPress={() => setMenuConv(item)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <View style={{ position: 'relative' }}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {avatar ? <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#6d7382', fontWeight: '600' }}>{initials}</Text>}
                </View>
                {item.isOnline && <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#000' }} />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>{title}</Text>
                  {item.last?.created_at && (
                    <Text style={{ color: '#6d7382', fontSize: 11, marginLeft: 8 }}>
                      {new Date(item.last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#6d7382', fontSize: 13, flex: 1 }} numberOfLines={1}>{lastText}</Text>
                  {item.unreadCount > 0 && (
                    <View style={{ backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{item.unreadCount}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setMenuConv(item)} style={{ paddingLeft: 12, paddingVertical: 10 }}>
                    <Ionicons name="ellipsis-vertical" size={18} color="#6d7382" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 }}>No conversations yet</Text>
            <Text style={{ color: '#6d7382', textAlign: 'center' }}>Start a chat from someone's profile or a post.</Text>
          </View>
        }
      />

      {/* Floating New Message Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Search')}
        style={{
          position: 'absolute',
          bottom: 24 + insets.bottom,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#ef4444',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
      </TouchableOpacity>

      <BottomSheet open={!!menuConv} onClose={() => setMenuConv(null)} maxHeight="40vh">
        <View style={{ padding: 20 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 20 }}>{menuConv?.group?.name || menuConv?.other?.full_name}</Text>
          <FastButton
            onPress={() => handleDelete(menuConv)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 }}
          >
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600' }}>Delete conversation</Text>
          </FastButton>
        </View>
      </BottomSheet>
    </View>
  );
}
