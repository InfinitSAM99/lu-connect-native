import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getChatTheme } from '../lib/chatThemes';
import { GroupMembersList } from '../components/ChatHelpers';
import MessageBubble from '../components/MessageBubble';
import ChatThemePicker from '../components/ChatThemePicker';
import BottomSheet from '../components/BottomSheet';
import FastButton from '../components/FastButton';

const MSG_COLS = 'id, conversation_id, sender_id, content, attachment_url, attachment_type, attachment_name, is_deleted, read_at, created_at, parent_id';

function formatLastSeen(lastSeen: string | null) {
  if (!lastSeen) return 'Offline';
  const secs = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
  if (secs < 30) return 'Online';
  if (secs < 60) return `Active ${secs}s ago`;
  if (secs < 3600) return `Active ${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `Last seen ${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `Last seen ${Math.floor(secs / 86400)}d ago`;
  return `Last seen ${Math.floor(secs / 604800)}w ago`;
}

async function loadConversation(conversationId: string, myId: string) {
  const [messagesRes, membersRes] = await Promise.all([
    supabase.from('messages').select(MSG_COLS).eq('conversation_id', conversationId).order('created_at', { ascending: true }),
    supabase.from('conversation_members').select('user_id, theme').eq('conversation_id', conversationId),
  ]);
  if (messagesRes.error) throw new Error(messagesRes.error.message);

  const rows = messagesRes.data || [];
  const memberRows = membersRes.data || [];
  const senderIds = [...new Set(rows.map((m: any) => m.sender_id))];
  const otherMember = memberRows.find((r: any) => r.user_id !== myId);

  const [profilesRes, otherProfileRes] = await Promise.all([
    senderIds.length > 0 ? supabase.from('profiles').select('id, full_name, avatar_url, last_seen, is_verified').in('id', senderIds) : Promise.resolve({ data: [] }),
    otherMember?.user_id ? supabase.from('profiles').select('id, full_name, avatar_url, last_seen, is_verified').eq('id', otherMember.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const profileMap: any = {};
  (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p; });

  const enriched = rows.map((m: any) => ({
    ...m,
    sender: profileMap[m.sender_id],
    parent: m.parent_id ? rows.find((x: any) => x.id === m.parent_id) : null,
  }));
  for (const m of enriched) {
    if (m.parent) m.parent.sender = profileMap[m.parent.sender_id];
  }

  const otherProfile = otherProfileRes.data || null;
  const lastSeenTs = otherProfile?.last_seen ? new Date(otherProfile.last_seen).getTime() : 0;
  const otherOnline = Date.now() - lastSeenTs < 30000;
  const myMembership = memberRows.find((r: any) => r.user_id === myId);

  supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', myId).is('read_at', null).then(() => {});
  supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', myId).then(() => {});

  let group = null, myRole = null;
  const { data: grp } = await supabase.from('groups').select('id, name, cover_url, member_count, conversation_id').eq('conversation_id', conversationId).maybeSingle();
  if (grp) {
    group = grp;
    const { data: gm } = await supabase.from('group_members').select('role').eq('group_id', grp.id).eq('user_id', myId).maybeSingle();
    myRole = gm?.role || null;
  }

  return { messages: enriched, other: otherProfile, otherOnline, myTheme: myMembership?.theme || 'classic', group, myRole };
}



export default function ConversationScreen({ route, navigation }: any) {
  const { id, draft } = route.params;
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;

  const [text, setText] = useState(draft || '');
  const [errMsg, setErrMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('classic');
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const recordingTimer = useRef<any>(null);
  const [recordingMs, setRecordingMs] = useState(0);

  const queryKey = useMemo(() => ['conversation', id, myId], [id, myId]);

  // PRESENCE HEARTBEAT
  useEffect(() => {
    if (!myId) return;
    const updatePresence = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', myId).then();
    };
    updatePresence();
    const interval = setInterval(updatePresence, 15000);
    return () => clearInterval(interval);
  }, [myId]);

  // TYPING CHANNEL SETUP
  useEffect(() => {
    if (!myId) return;
    const channel = supabase.channel(`typing-${id}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== myId) {
          setIsOtherTyping(payload.payload.is_typing);
          if (payload.payload.is_typing) {
            setTimeout(() => setIsOtherTyping(false), 3000);
          }
        }
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [id, myId]);

  const convQuery = useQuery({
    queryKey,
    enabled: !!id && !!myId,
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => loadConversation(id, myId!),
  });
  const rawMessages = convQuery.data?.messages || [];
  const messages = [...rawMessages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const other = convQuery.data?.other || null;
  const otherOnline = convQuery.data?.otherOnline || false;
  const group = convQuery.data?.group || null;
  const myRole = convQuery.data?.myRole || null;
  const isGroup = !!group;
  const isGroupAdmin = myRole === 'owner' || myRole === 'admin';
  const loading = convQuery.isLoading;

  useEffect(() => { if (convQuery.error) setErrMsg((convQuery.error as any).message); }, [convQuery.error]);
  useEffect(() => { if (convQuery.data?.myTheme) setActiveTheme(convQuery.data.myTheme); }, [convQuery.data?.myTheme]);

  useEffect(() => {
    if (!id || !myId) return;
    const now = new Date().toISOString();
    supabase.from('messages').update({ read_at: now }).eq('conversation_id', id).neq('sender_id', myId).is('read_at', null).then();
    supabase.from('conversation_members').update({ last_read_at: now }).eq('conversation_id', id).eq('user_id', myId).then();
    queryClient.invalidateQueries({ queryKey: ['convs', myId] });
  }, [id, myId, queryClient]);

  useEffect(() => {
    if (!id || !myId) return;
    const ch = supabase.channel(`conv-${id}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
      async (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newRow = payload.new;
          if (newRow.sender_id === myId) return;
          const existing: any = queryClient.getQueryData(queryKey);
          if (!existing) return;
          if (existing.messages?.some((m: any) => m.id === newRow.id)) return;

          const { data: s } = await supabase.from('profiles').select('id, full_name, avatar_url, is_verified').eq('id', newRow.sender_id).maybeSingle();
          const sender = s || null;

          setIsOtherTyping(false); // Hide typing bubble instantly when message arrives

          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return { ...old, messages: [...old.messages, { ...newRow, sender }] };
          });
                    queryClient.invalidateQueries({ queryKey: ['convs', myId] });
        }
        else if (payload.eventType === 'UPDATE') {
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return { ...old, messages: old.messages.map((m: any) => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at, is_deleted: payload.new.is_deleted } : m) };
          });
        }
        else if (payload.eventType === 'DELETE') {
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return { ...old, messages: old.messages.filter((m: any) => m.id !== payload.old.id) };
          });
        }
      }
    );
    const timer = setTimeout(() => ch.subscribe(), 100);

    const profileCh = supabase.channel(`profile-${other?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${other?.id}` }, (payload) => {
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return { ...old, other: { ...old.other, ...payload.new } };
        });
      });

    const profileTimer = setTimeout(() => profileCh.subscribe(), 100);

    return () => {
      clearTimeout(timer);
      clearTimeout(profileTimer);
      supabase.removeChannel(ch);
      supabase.removeChannel(profileCh);
    };
  }, [id, myId, queryClient, queryKey, other?.id]);

  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (lastMsgId) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [lastMsgId, isOtherTyping]);

  const insertMessage = async (payload: any) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, { ...payload, id: tempId, sender: profile, _optimistic: true, created_at: new Date().toISOString() }] };
    });

    const { data: inserted, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: myId, ...payload }).select(MSG_COLS).single();

    if (error) {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, messages: old.messages.filter((m: any) => m.id !== tempId) };
      });
      throw new Error(error.message);
    }

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return { ...old, messages: old.messages.map((m: any) => m.id === tempId ? { ...inserted, sender: profile, _optimistic: false } : m) };
    });
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (!typingChannelRef.current) return;
    if (val.trim().length > 0) {
      typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: myId, is_typing: true } });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: myId, is_typing: false } });
      }, 2000);
    }
  };

  const sendText = async () => {
    const content = text.trim();
    if (!content) return;
    const parentId = replyingTo?.id || null;
    setText(''); setReplyingTo(null);
    if (typingChannelRef.current) {
      typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: myId, is_typing: false } });
    }
        try { await insertMessage({ content, parent_id: parentId }); }
    catch (e: any) { setErrMsg(e.message); }
  };

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      clearInterval(recordingTimer.current);
      try {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (!uri) return;
        setUploading(true);
        const blob = await (await fetch(uri)).blob();
        const path = `${myId}/${id}-${Date.now()}.m4a`;
        await supabase.storage.from('messages').upload(path, blob, { contentType: 'audio/m4a' });
        const { data: { publicUrl } } = supabase.storage.from('messages').getPublicUrl(path);
        await insertMessage({ content: '', attachment_url: publicUrl, attachment_type: 'audio' });
      } catch (e: any) { setErrMsg(e.message); } finally { setUploading(false); }
    } else {
      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) { setErrMsg('Microphone permission required.'); return; }
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setRecording(true);
        setRecordingMs(0);
        recordingTimer.current = setInterval(() => setRecordingMs(prev => prev + 1000), 1000);
      } catch (e: any) { setErrMsg(e.message); }
    }
  };

  const cancelRecording = async () => {
    setRecording(false);
    clearInterval(recordingTimer.current);
    try { await audioRecorder.stop(); } catch {}
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled) return;
    setUploading(true);
    try {
      const uri = res.assets[0].uri;
      const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
      const path = `${myId}/${id}-${Date.now()}.${ext}`;
      const blob = await (await fetch(uri)).blob();
      await supabase.storage.from('messages').upload(path, blob, { contentType: 'image/jpeg' });
      const { data: { publicUrl } } = supabase.storage.from('messages').getPublicUrl(path);
      await insertMessage({ content: '', attachment_url: publicUrl, attachment_type: 'image' });
    } catch (e: any) { setErrMsg(e.message); } finally { setUploading(false); }
  };

  const deleteMessage = (msg: any) => {
    if (!profile || msg.sender_id !== profile.id) return;
    Alert.alert('Delete message', 'Delete for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          queryClient.setQueryData(queryKey, (old: any) => old ? { ...old, messages: old.messages.map((m: any) => m.id === msg.id ? { ...m, is_deleted: true, content: '', attachment_url: null, attachment_type: null } : m) } : old);
          await supabase.from('messages').update({ is_deleted: true }).eq('id', msg.id);
        }
      }
    ]);
  };

  const theme = getChatTheme(activeTheme);

  if (loading && !messages.length) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1 }}>
        {theme.isGradient ? (
          <LinearGradient colors={theme.colors as any} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bg }]} />
        )}

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 6 }}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }} onPress={() => isGroup && setMembersOpen(true)} disabled={!isGroup}>
            {isGroup ? (
              <>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 10 }}>
                  {group!.cover_url ? <Image source={{ uri: group!.cover_url }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="people" size={20} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15, color: '#fff' }} numberOfLines={1}>{group!.name}</Text>
                  <Text style={{ fontSize: 11, color: '#6d7382' }}>{group!.member_count || 1} members</Text>
                </View>
              </>
            ) : other ? (
              <>
                <View style={{ marginRight: 10 }}>
                  <Image source={{ uri: other.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${other.full_name}` }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15, color: '#fff' }} numberOfLines={1}>{other.full_name}</Text>
                  <Text style={{ fontSize: 11, color: otherOnline ? '#22c55e' : '#6d7382' }}>{otherOnline ? 'Online' : formatLastSeen(other.last_seen)}</Text>
                </View>
              </>
            ) : (
              <Text style={{ color: '#fff' }}>Loading…</Text>
            )}
          </TouchableOpacity>
          <FastButton onPress={() => setMenuOpen(true)} style={{ padding: 8, marginLeft: 4 }}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </FastButton>
        </View>

        {errMsg ? <View style={{ backgroundColor: '#7f1d1d', margin: 10, padding: 10, borderRadius: 8 }}><Text style={{ color: '#fff', fontSize: 13 }}>{errMsg}</Text></View> : null}

        <FlatList
          ref={scrollRef}
          data={messages}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 14 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble message={item} profile={profile} navigation={navigation} onDelete={deleteMessage} onReply={(msg: any) => setReplyingTo(msg)} otherOnline={otherOnline} />
          )}
          ListFooterComponent={() => (
            isOtherTyping ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 12 }}>
                {other && (
                  <Image source={{ uri: other.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${other.full_name}` }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 4, backgroundColor: '#222' }} />
                )}
                <View style={{ backgroundColor: '#262626', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={styles.dot} />
                  <View style={styles.dot} />
                  <View style={styles.dot} />
                </View>
              </View>
            ) : null
          )}
        />

        

        {recording && (
          <View style={styles.recordingBar}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 10 }} />
            <Text style={{ color: '#ef4444', fontWeight: '700', flex: 1 }}>
              Recording... {Math.floor(recordingMs / 1000)}s (Tap mic to send)
            </Text>
            <TouchableOpacity onPress={cancelRecording}>
              <Text style={{ color: '#6d7382', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={{ width: 3, height: 30, backgroundColor: '#ef4444', borderRadius: 2, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>{replyingTo.sender?.full_name || 'User'}</Text>
              <Text style={{ color: '#6d7382', fontSize: 13 }} numberOfLines={1}>{replyingTo.content || 'Media'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 6 }}>
              <Ionicons name="close-circle" size={22} color="#6d7382" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity onPress={pickImage} disabled={uploading} style={styles.attachBtn}>
            <Ionicons name="add" size={26} color="#ef4444" />
          </TouchableOpacity>

          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="Message" placeholderTextColor="#6d7382" value={text} onChangeText={handleTyping} multiline />
          </View>

          <TouchableOpacity style={[styles.sendBtn, recording && { backgroundColor: '#ef4444' }]} onPress={text.trim().length > 0 ? sendText : toggleRecording}>
            <Ionicons name={text.trim().length > 0 ? "send" : "mic"} size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} maxHeight="60vh">
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Chat Options</Text>
              <FastButton onPress={() => setMenuOpen(false)}><Ionicons name="close" size={24} color="#fff" /></FastButton>
            </View>
            <FastButton style={styles.menuRow} onPress={() => { setMenuOpen(false); setThemePickerOpen(true); }}>
              <Ionicons name="color-palette-outline" size={22} color="#fff" />
              <Text style={styles.menuText}>Change Theme</Text>
            </FastButton>
            <FastButton style={styles.menuRow} onPress={() => { setMenuOpen(false); Alert.alert('Report User', 'Sent to admins.'); }}>
              <Ionicons name="flag-outline" size={22} color="#f59e0b" />
              <Text style={[styles.menuText, { color: '#f59e0b' }]}>Report User</Text>
            </FastButton>
            <FastButton style={styles.menuRow} onPress={() => { setMenuOpen(false); Alert.alert('Block User', 'Blocked.'); }}>
              <Ionicons name="ban-outline" size={22} color="#ef4444" />
              <Text style={[styles.menuText, { color: '#ef4444' }]}>Block User</Text>
            </FastButton>
          </View>
        </BottomSheet>

        <ChatThemePicker
          open={themePickerOpen}
          current={activeTheme}
          onSelect={(themeId) => {
            setActiveTheme(themeId);
            setThemePickerOpen(false);
            supabase.from('conversation_members').update({ theme: themeId }).eq('conversation_id', id).eq('user_id', myId).then();
          }}
          onClose={() => setThemePickerOpen(false)}
        />

        {isGroup && (
          <Modal visible={membersOpen} transparent animationType="slide" onRequestClose={() => setMembersOpen(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{group!.name}</Text>
                  <FastButton onPress={() => setMembersOpen(false)}><Ionicons name="close" size={22} color="#fff" /></FastButton>
                </View>
                {isGroupAdmin && (
                  <FastButton style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#1f1f1f', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setMembersOpen(false); navigation.navigate('GroupSettings', { id: group!.id }); }}>
                    <Ionicons name="settings" size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', marginLeft: 16, flex: 1 }}>Group settings</Text>
                    <Ionicons name="chevron-forward" size={18} color="#6d7382" />
                  </FastButton>
                )}
                <ScrollView style={{ maxHeight: 400 }}>
                  <GroupMembersList groupId={group!.id} myId={myId} />
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  recordingBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1a0d0f', borderTopWidth: 1, borderTopColor: '#3b1215' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#1a0d0f', borderTopWidth: 1, borderTopColor: 'rgba(239,68,68,0.2)', borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', backgroundColor: '#000' },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414', marginBottom: 2 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#1f1f1f', minHeight: 44 },
  input: { flex: 1, color: '#fff', fontSize: 15, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginBottom: 2, shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#6d7382' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 16 },
  menuText: { fontSize: 16, color: '#fff', fontWeight: '500' },
});
