import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomSheet from '../components/BottomSheet';

async function loadGroup(id: string, myId: string) {
  const { data: group, error: gErr } = await supabase.from('groups').select('*, profiles:created_by(full_name)').eq('id', id).maybeSingle();
  if (gErr) throw new Error(gErr.message);
  if (!group) throw new Error('Group not found');

  const [membersRes, meRes] = await Promise.all([
    supabase.from('group_members').select('user_id, role, joined_at, profiles:user_id(id, full_name, avatar_url, is_verified)').eq('group_id', id),
    supabase.from('group_members').select('role').eq('group_id', id).eq('user_id', myId).maybeSingle(),
  ]);

  const members = (membersRes.data || []).map((m) => ({ user_id: m.user_id, role: m.role || 'member', profile: m.profiles }));
  const myRole = meRes.data?.role || null;
  const isMember = !!myRole;
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  let messages: any[] = [];
  if (group.conversation_id) {
    const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', group.conversation_id).order('created_at', { ascending: true });
    const senderIds = [...new Set((msgs || []).map((m) => m.sender_id))];
    const { data: profiles } = senderIds.length ? await supabase.from('profiles').select('id, full_name, avatar_url, is_verified').in('id', senderIds) : { data: [] };
    const pMap: Record<string, any> = {};
    (profiles || []).forEach((p) => { pMap[p.id] = p; });
    messages = (msgs || []).map((m) => ({ ...m, sender: pMap[m.sender_id] }));
  }

  return { group, members, myRole, isMember, isAdmin, messages };
}

export default function GroupDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [text, setText] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const queryKey = ['group', id, profile?.id];
  const { data, isLoading, error } = useQuery({ queryKey, enabled: !!id && !!profile?.id, staleTime: 30000, queryFn: () => loadGroup(id, profile.id) });

  const group = data?.group;
  const members = data?.members || [];
  const messages = data?.messages || [];
  const isMember = data?.isMember || false;
  const isAdmin = data?.isAdmin || false;
  const conversationId = group?.conversation_id;

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`group-chat-${conversationId}-${Date.now()}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
      const { data: sender } = await supabase.from('profiles').select('id, full_name, avatar_url, is_verified').eq('id', payload.new.sender_id).maybeSingle();
      queryClient.setQueryData(queryKey, (old: any) => old ? { ...old, messages: [...old.messages, { ...payload.new, sender }] } : old);
    });
    const timer = setTimeout(() => channel.subscribe(), 100);
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, [conversationId, queryClient, queryKey]);

  const send = async () => {
    const content = text.trim();
    if (!content || !conversationId || !profile) return;
    setText('');
    await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: profile.id, content });
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  };

  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;
  if (error || !group) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff' }}>Group not found</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setDrawerOpen(true)}>
          <View style={styles.groupIcon}><Ionicons name="people" size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{group.name}</Text>
            <Text style={{ fontSize: 12, color: '#6d7382' }}>{members.length || group.member_count || 1} members</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={{ padding: 8 }}><Ionicons name="ellipsis-horizontal" size={22} color="#fff" /></TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 12, paddingBottom: 20 }}>
          {messages.length === 0 && <Text style={{ color: '#6d7382', textAlign: 'center', padding: 60 }}>No messages yet. Say hi 👋</Text>}
          {messages.map((m: any) => {
            const mine = m.sender_id === profile.id;
            return (
              <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <View style={{ maxWidth: '78%', backgroundColor: mine ? '#ef4444' : '#141414', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4 }}>
                  {!mine && <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff', opacity: 0.85, marginBottom: 3 }}>{m.sender?.full_name || 'User'}</Text>}
                  <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{m.is_deleted ? 'This message was deleted' : m.content}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {isMember && conversationId && (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
            <TextInput style={styles.chatInput} placeholder="Message" placeholderTextColor="#6d7382" value={text} onChangeText={setText} multiline />
            <TouchableOpacity style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]} onPress={send} disabled={!text.trim()}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <BottomSheet open={drawerOpen} onClose={() => setDrawerOpen(false)} maxHeight="80vh">
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
            <View style={[styles.groupIcon, { width: 64, height: 64, borderRadius: 16 }]}><Ionicons name="people" size={32} color="#fff" /></View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 12 }}>{group.name}</Text>
            <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 4 }}>{members.length} members</Text>
          </View>

          {isAdmin && (
            <TouchableOpacity style={styles.row} onPress={() => { setDrawerOpen(false); navigation.navigate('GroupSettings', { id }); }}>
              <Ionicons name="settings" size={22} color="#fff" style={{ width: 24 }} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: '#fff', marginLeft: 16 }}>Group settings</Text>
              <Ionicons name="chevron-forward" size={18} color="#6d7382" />
            </TouchableOpacity>
          )}

          <Text style={{ paddingHorizontal: 20, paddingVertical: 12, fontSize: 13, color: '#6d7382' }}>Members</Text>
          {members.map((m: any) => (
            <View key={m.user_id} style={styles.row}>
              <Image source={{ uri: m.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.profile?.full_name}` }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 15, color: '#fff', fontWeight: '500' }}>{m.profile?.full_name || 'User'}{m.user_id === profile.id ? ' (you)' : ''}</Text>
                {m.role !== 'member' && <Text style={{ fontSize: 12, color: '#6d7382', textTransform: 'capitalize', marginTop: 2 }}>{m.role}</Text>}
              </View>
            </View>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  groupIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, borderTopColor: '#1f1f1f', backgroundColor: '#000' },
  chatInput: { flex: 1, backgroundColor: '#141414', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
});
