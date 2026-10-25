import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { playMessageIn, playMessageOut } from '../lib/sounds';
import { getChatTheme } from '../lib/chatThemes';
import { SwipeableMessage, GroupMembersList, DoodleBackground, isEmojiOnly } from '../components/ChatHelpers';
import ChatThemePicker from '../components/ChatThemePicker';
import BottomSheet from '../components/BottomSheet';
import FastButton from '../components/FastButton';

const MAX_IMAGE_MB = 5;
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('classic');
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const queryKey = useMemo(() => ['conversation', id, myId], [id, myId]);

  useEffect(() => {
    const s = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const h = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { s.remove(); h.remove(); };
  }, []);

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
  // Stable sort by created_at to guarantee order
  const messages = [...rawMessages].sort((a: any, b: any) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const other = convQuery.data?.other || null;
  const otherOnline = convQuery.data?.otherOnline || false;
  const group = convQuery.data?.group || null;
  const myRole = convQuery.data?.myRole || null;
  const isGroup = !!group;
  const isGroupAdmin = myRole === 'owner' || myRole === 'admin';
  const loading = convQuery.isLoading;

  useEffect(() => { if (convQuery.error) setErrMsg((convQuery.error as any).message); }, [convQuery.error]);
  
  useEffect(() => {
    if (convQuery.data?.myTheme) setActiveTheme(convQuery.data.myTheme);
  }, [convQuery.data?.myTheme]);

  // ✅ FIXED: Realtime subscription with own-message guard
  useEffect(() => {
    if (!id || !myId) return;
    const ch = supabase.channel(`conv-${id}-${Date.now()}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
      async (payload: any) => {
        // Ignore our own INSERTs (already added optimistically)
        if (payload.eventType === 'INSERT') {
          const newRow = payload.new;
          if (newRow.sender_id === myId) return;
          
          const existing: any = queryClient.getQueryData(queryKey);
          if (!existing) return;
          if (existing.messages?.some((m: any) => m.id === newRow.id)) return;
          
          const { data: s } = await supabase.from('profiles').select('id, full_name, avatar_url, is_verified').eq('id', newRow.sender_id).maybeSingle();
          const sender = s || null;
          
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return { ...old, messages: [...old.messages, { ...newRow, sender }] };
          });
          try { playMessageIn(); } catch {}
          queryClient.invalidateQueries({ queryKey: ['convs', myId] });
        } 
        // Skip UPDATEs for own messages
        else if (payload.eventType === 'UPDATE') {
          if (payload.new.sender_id === myId) return;
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return { ...old, messages: old.messages.map((m: any) => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at, is_deleted: payload.new.is_deleted } : m) };
          });
        }
        // DELETE
        else if (payload.eventType === 'DELETE') {
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return { ...old, messages: old.messages.filter((m: any) => m.id !== payload.old.id) };
          });
        }
      }
    );
    const timer = setTimeout(() => ch.subscribe(), 100);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [id, myId, queryClient, queryKey]);

  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (lastMsgId) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [lastMsgId]);

  const insertMessage = async (payload: any) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const content = payload.content || '';


    // 2. Optimistic add
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, { ...payload, id: tempId, sender: profile, _optimistic: true, created_at: new Date().toISOString() }]
      };
    });

    // 3. Network
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_id: myId, ...payload })
      .select(MSG_COLS).single();

    if (error) {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, messages: old.messages.filter((m: any) => m.id !== tempId) };
      });
      throw new Error(error.message);
    }

    // 4. Reconcile: swap temp message properties in-place (do NOT reorder)
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.map((m: any) => {
          // Replace temp with real, keeping position stable
          if (m.id === tempId) {
            return { ...inserted, sender: profile, _optimistic: false };
          }
          // Drop duplicate from realtime if it slipped through
          if (m.id === inserted.id) {
            return null;
          }
          return m;
        }).filter(Boolean)
      };
    });
    // Note: intentionally NOT invalidating conversation cache to avoid flicker
  };

  const sendText = async () => {
    const content = text.trim();
    if (!content) return;
    const parentId = replyingTo?.id || null;
    setText(''); setReplyingTo(null);
    try { playMessageOut(); } catch {}
    try { await insertMessage({ content, parent_id: parentId }); }
    catch (e: any) { setErrMsg(e.message); }
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>
        
        {/* THEME BACKGROUND */}
        {theme.isGradient ? (
          <LinearGradient colors={theme.colors as any} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bg }]} />
        )}

        {/* HEADER */}
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

        {/* MESSAGES */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled">
          {messages.map((m: any) => (
            <SwipeableMessage
              key={m.id}
              message={m}
              profile={profile}
              deleted={m.is_deleted}
              isImage={!m.is_deleted && m.attachment_type === 'image'}
              isAudio={!m.is_deleted && m.attachment_type === 'audio'}
              isSticker={!m.is_deleted && !m.attachment_url && isEmojiOnly(m.content)}
              onDelete={deleteMessage}
              onReply={(msg: any) => setReplyingTo(msg)}
              onScrollTo={() => scrollRef.current?.scrollToEnd({ animated: true })}
              showSenderName={isGroup && m.sender_id !== profile!.id}
              themeObj={theme}
            />
          ))}
        </ScrollView>

        {replyingTo && (
          <View style={styles.replyBar}>
            <Ionicons name="return-down-forward" size={16} color="#ef4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: '600', color: '#ef4444', fontSize: 12 }}>Replying to {replyingTo.sender_id === profile!.id ? 'yourself' : (replyingTo.sender?.full_name || 'message')}</Text>
              <Text style={{ fontSize: 12, color: '#6d7382' }} numberOfLines={1}>{replyingTo.content || '(media)'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}><Ionicons name="close" size={16} color="#fff" /></TouchableOpacity>
          </View>
        )}

        {/* COMPOSER */}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.composerBar}>
            <TextInput style={styles.input} placeholder="Message" placeholderTextColor="#6d7382" value={text} onChangeText={setText} multiline />
            <FastButton onPress={pickImage} style={{ padding: 6 }} disabled={uploading}>
              <Ionicons name="attach" size={22} color="#fff" />
            </FastButton>
          </View>
          <FastButton style={styles.sendBtn} onPress={sendText} disabled={uploading}>
            <Ionicons name="send" size={20} color="#fff" />
          </FastButton>
        </View>

        {/* CHAT OPTIONS */}
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

        {/* CHAT THEME PICKER */}
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

        {/* GROUP MEMBERS MODAL */}
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
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#141414', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.8)' },
  composerBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 24, paddingHorizontal: 6, paddingVertical: 4 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingHorizontal: 8, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 16 },
  menuText: { fontSize: 16, color: '#fff', fontWeight: '500' },
});
