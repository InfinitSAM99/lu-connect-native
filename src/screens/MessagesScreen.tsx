import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  let profileMap: any = {};
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, last_seen, is_broadcast_only').eq('is_bot', false).in('id', otherUserIds);
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });
  }

  const otherByConv: any = {};
  (otherMembersRes.data || []).forEach((row: any) => {
    if (!otherByConv[row.conversation_id] && profileMap[row.user_id]) otherByConv[row.conversation_id] = profileMap[row.user_id];
  });
  const groupByConv: any = {};
  (groupsRes.data || []).forEach((g: any) => { groupByConv[g.conversation_id] = g; });
  const lastByConv: any = {};
  (recentMsgsRes.data || []).forEach((msg: any) => { if (!lastByConv[msg.conversation_id]) lastByConv[msg.conversation_id] = msg; });
  const unreadByConv: any = {};
  (members || []).forEach((m: any) => {
    const lastReadTs = m.last_read_at ? new Date(m.last_read_at).getTime() : 0;
    let count = 0;
    (recentMsgsRes.data || []).forEach((msg: any) => {
      if (msg.conversation_id !== m.conversation_id) return;
      if (msg.sender_id === profileId) return;
      if (new Date(msg.created_at).getTime() <= lastReadTs) return;
      count += 1;
    });
    unreadByConv[m.conversation_id] = count;
  });

  const enriched = (members || []).map((m: any) => ({
    ...m.conversations,
    other: otherByConv[m.conversation_id] || null,
    last: lastByConv[m.conversation_id] || null,
    unreadCount: unreadByConv[m.conversation_id] || 0,
    isOnline: otherByConv[m.conversation_id] ? isRecent(otherByConv[m.conversation_id].last_seen) : false,
    group: groupByConv[m.conversation_id] || null,
  }));
  enriched.sort((a: any, b: any) => {
    const aTime = new Date(a.last?.created_at || a.updated_at || 0).getTime();
    const bTime = new Date(b.last?.created_at || b.updated_at || 0).getTime();
    return bTime - aTime;
  });
  return enriched;
}

async function loadFriends(profileId: string) {
  const { data: connections } = await supabase.from('connections').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`);
  const friendIds = (connections || []).map((c: any) => (c.requester_id === profileId ? c.receiver_id : c.requester_id)).filter(Boolean);
  if (friendIds.length === 0) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, last_seen, is_broadcast_only').eq('is_bot', false).in('id', friendIds);
  return (profiles || []).map((p: any) => ({ ...p, isOnline: isRecent(p.last_seen) }));
}

function AvatarWithPresence({ src, size = 56, online = false }: any) {
  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      {online && <View style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#000' }} />}
    </View>
  );
}

export default function MessagesScreen({ navigation }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;

  const [q, setQ] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [menuFor, setMenuFor] = useState<any>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  const convsQuery = useQuery({ queryKey: ['convs', myId], enabled: !!myId, staleTime: 15000, queryFn: () => loadConversations(myId!) });
  const friendsQuery = useQuery({ queryKey: ['friends-strip', myId], enabled: !!myId, staleTime: 60000, queryFn: () => loadFriends(myId!) });

  const convs = convsQuery.data || [];
  const friends = friendsQuery.data || [];
  const loading = convsQuery.isLoading;

  useEffect(() => {
    if (convsQuery.error) setErrMsg('Load error: ' + (convsQuery.error as any).message);
  }, [convsQuery.error]);

  // Realtime — new/updated messages or member changes refresh list
  useEffect(() => {
    if (!myId) return;
    let active = true;
    let timer: any = null;
    const bump = () => {
      if (!active) return;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (!active) return;
        queryClient.invalidateQueries({ queryKey: ['convs', myId] });
      }, 400);
    };
    const ch = supabase.channel(`messages-list-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, bump)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members' }, bump)
      .subscribe();
    const t = setTimeout(() => { if (active) ch.subscribe(); }, 100);
    return () => { active = false; if (timer) clearTimeout(timer); clearTimeout(t); supabase.removeChannel(ch); };
  }, [myId, queryClient]);

  // User search in search mode
  useEffect(() => {
    if (!searchMode || !profile) return;
    const run = (qText: string) => {
      let query = supabase.from('profiles').select('id, full_name, avatar_url, last_seen, is_broadcast_only').eq('is_bot', false).neq('id', profile.id).order('full_name').limit(100);
      if (qText?.trim()) query = query.ilike('full_name', `%${qText.trim()}%`);
      query.then(({ data }) => setPeople(data || []));
    };
    if (!q.trim()) { run(''); return; }
    const t = setTimeout(() => run(q), 250);
    return () => clearTimeout(t);
  }, [q, searchMode, profile?.id]);

  const startConv = async (otherId: string) => {
    if (!profile || !otherId) return;
    setErrMsg('');
    const { data: convId, error } = await supabase.rpc('create_dm', { other_user_id: otherId });
    if (error || !convId) { setErrMsg('Could not start conversation: ' + (error?.message || 'unknown')); return; }
    queryClient.invalidateQueries({ queryKey: ['convs', myId] });
    setSearchMode(false); setQ('');
    navigation.navigate('Conversation', { id: convId });
  };

  const clearChat = (c: any) => {
    setMenuFor(null);
    Alert.alert('Clear chat', 'Delete all messages in this chat?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
          await supabase.from('messages').delete().eq('conversation_id', c.id);
          queryClient.invalidateQueries({ queryKey: ['convs', myId] });
        }
      }
    ]);
  };

  const deleteConversation = (c: any) => {
    setMenuFor(null);
    Alert.alert('Delete conversation', 'It will be removed from your chat list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('conversation_members').delete().eq('conversation_id', c.id).eq('user_id', profile!.id);
          queryClient.invalidateQueries({ queryKey: ['convs', myId] });
        }
      }
    ]);
  };

  const renderConv = useCallback(({ item: c }: any) => {
    const isGroup = !!c.is_group;
    const title = isGroup ? (c.group?.name || c.name || 'Group') : (c.other?.full_name || 'Unknown');
    return (
      <View style={styles.convRow}>
        <AppButton style={{ flexDirection: 'row', flex: 1, alignItems: 'center', gap: 14 }} onPress={() => navigation.navigate('Conversation', { id: c.id })}>
          {isGroup ? (
            <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {c.group?.cover_url ? <Image source={{ uri: c.group.cover_url }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="people" size={24} color="#fff" />}
            </View>
          ) : (
            <AvatarWithPresence src={c.other?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.other?.full_name || 'U'}`} size={56} online={c.isOnline} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#fff' }} numberOfLines={1}>{title}</Text>
            <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }} numberOfLines={1}>
              {c.last?.content ? (c.last.sender_id === profile!.id ? 'You: ' : '') + c.last.content : (isGroup ? `${c.group?.member_count || 0} members` : 'No messages yet')}
            </Text>
          </View>
          {c.unreadCount > 0 && (
            <View style={styles.unreadBadge}><Text style={styles.unreadText}>{c.unreadCount > 99 ? '99+' : c.unreadCount}</Text></View>
          )}
        </AppButton>
        <AppButton onPress={() => setMenuFor(c)} style={{ padding: 8 }}>
          <Ionicons name="ellipsis-vertical" size={18} color="#6d7382" />
        </AppButton>
      </View>
    );
  }, [navigation, profile?.id]);

  const ListHeader = () => (
    friends.length > 0 ? (
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.sectionLabel}>Friends</Text>
        <FlatList
          horizontal
          data={friends}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: f }) => (
            <TouchableOpacity style={{ alignItems: 'center', width: 68, gap: 6 }} onPress={() => startConv(f.id)}>
              <AvatarWithPresence src={f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.full_name}`} size={56} online={f.isOnline} />
              <Text style={{ fontSize: 11, color: '#6d7382', maxWidth: 64, textAlign: 'center' }} numberOfLines={1}>{f.full_name?.split(' ')[0] || 'Friend'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    ) : null
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        centeredHero
        title={searchMode ? 'New Chat' : 'Chats'}
        subtitle={searchMode ? 'Search for a student' : 'Your conversations'}
        showBack={false}
        centerIcon={searchMode ? undefined : <Ionicons name="chatbubbles" size={72} color="#ef4444" />}
        rightComponent={
          !searchMode ? (
            <TouchableOpacity onPress={() => setHeaderMenuOpen(true)} style={{ padding: 6 }}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          ) : null
        }
      />

      {errMsg ? <View style={styles.errBox}><Text style={{ color: '#fff', fontSize: 13 }}>{errMsg}</Text></View> : null}

      {searchMode ? (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 10 }}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#6d7382" />
              <TextInput style={styles.searchInput} placeholder="Search students…" placeholderTextColor="#6d7382" value={q} onChangeText={setQ} autoFocus />
            </View>
            <TouchableOpacity onPress={() => { setSearchMode(false); setQ(''); }} style={styles.cancelBtn}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={people}
            keyExtractor={(p: any) => p.id}
            ListEmptyComponent={<Text style={{ color: '#6d7382', textAlign: 'center', padding: 32 }}>No students found</Text>}
            renderItem={({ item: p }) => (
              <TouchableOpacity style={styles.convRow} onPress={() => !p.is_broadcast_only && startConv(p.id)}>
                <AvatarWithPresence src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}`} size={56} online={isRecent(p.last_seen)} />
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#fff', marginLeft: 16 }}>{p.full_name}</Text>
              </TouchableOpacity>
            )}
            initialNumToRender={15}
            windowSize={10}
          />
        </View>
      ) : (
        <FlatList
          data={convs}
          renderItem={renderConv}
          keyExtractor={(c: any) => c.id}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            loading ? null : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 }}>No conversations yet</Text>
                <Text style={{ fontSize: 13, color: '#6d7382', textAlign: 'center' }}>Tap the + button to start chatting.</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={8}
          removeClippedSubviews
        />
      )}

      {!searchMode && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 90 }]} onPress={() => { setSearchMode(true); setQ(''); setErrMsg(''); }}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* HEADER MENU */}
      <BottomSheet open={headerMenuOpen} onClose={() => setHeaderMenuOpen(false)} maxHeight="40vh">
        <View style={{ padding: 20 }}>
          <Text style={{ textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 20 }}>Chats</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setHeaderMenuOpen(false); setSearchMode(true); setQ(''); }}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>New chat</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* CHAT ACTIONS */}
      <BottomSheet open={!!menuFor} onClose={() => setMenuFor(null)} maxHeight="50vh">
        {menuFor && (
          <View style={{ padding: 20 }}>
            <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 20 }}>
              {menuFor.is_group ? (menuFor.group?.name || menuFor.name || 'Group') : (menuFor.other?.full_name || 'Chat')}
            </Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => clearChat(menuFor)}>
              <Ionicons name="ban-outline" size={20} color="#fff" />
              <Text style={styles.secondaryBtnText}>Clear chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#ef4444' }]} onPress={() => deleteConversation(menuFor)}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Delete conversation</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  errBox: { backgroundColor: '#7f1d1d', marginHorizontal: 20, marginBottom: 12, padding: 10, borderRadius: 8 },
  convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#141414', borderRadius: 14, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#1f1f1f', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  unreadBadge: { backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#ef4444', padding: 16, borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#141414', padding: 16, borderRadius: 16 },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
