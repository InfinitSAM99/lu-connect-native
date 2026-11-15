import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomSheet from '../components/BottomSheet';
import VerifiedBadge from '../components/VerifiedBadge';

async function loadGroup(id: string, myId: string) {
  const { data: group, error } = await supabase.from('groups').select('id, name, description, cover_url, category, faculty, year_of_study, member_count, privacy, is_official, conversation_id, created_by').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!group) throw new Error('Group not found');

  const [membersRes, meRes] = await Promise.all([
    supabase.from('group_members').select('user_id, role, joined_at, profiles:user_id(id, full_name, avatar_url, is_verified)').eq('group_id', id),
    supabase.from('group_members').select('role').eq('group_id', id).eq('user_id', myId).maybeSingle(),
  ]);

  const members = (membersRes.data || []).map((m) => ({ user_id: m.user_id, role: m.role || 'member', profile: m.profiles }));
  const myRole = meRes.data?.role || null;

  return { group, members, myRole, isOwner: myRole === 'owner', isAdmin: myRole === 'owner' || myRole === 'admin' };
}

export default function GroupSettingsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [memberSheet, setMemberSheet] = useState<any>(null);
  const [addSheet, setAddSheet] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const queryKey = ['group-settings', id, myId];
  const { data, isLoading, error } = useQuery({ queryKey, enabled: !!id && !!myId, staleTime: 30000, queryFn: () => loadGroup(id, myId) });

  const group = data?.group;
  const members = data?.members || [];
  const isOwner = data?.isOwner || false;
  const isAdmin = data?.isAdmin || false;

  useEffect(() => {
    if (group) {
      setName(group.name || '');
      setDescription(group.description || '');
    }
  }, [group?.id]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['group', id, myId] });
    queryClient.invalidateQueries({ queryKey: ['groups', myId] });
  };

  const saveInfo = async () => {
    if (!name.trim() || savingInfo) return;
    setSavingInfo(true);
    const { error: e } = await supabase.from('groups').update({ name: name.trim(), description }).eq('id', id);
    if (e) { Alert.alert('Error', e.message); setSavingInfo(false); return; }
    if (group.conversation_id) await supabase.from('conversations').update({ name: name.trim() }).eq('id', group.conversation_id);
    setSavingInfo(false);
    invalidate();
  };

  const pickAndUploadCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;

    setUploadingCover(true);
    const file = result.assets[0];
    const ext = file.uri.split('.').pop() || 'jpg';
    const path = `groups/${id}/cover-${Date.now()}.${ext}`;

    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: upErr } = await supabase.storage.from('groups').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (upErr) { Alert.alert('Upload failed', upErr.message); setUploadingCover(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('groups').getPublicUrl(path);
    await supabase.from('groups').update({ cover_url: publicUrl }).eq('id', id);
    setUploadingCover(false);
    invalidate();
  };

  const promote = async (userId: string) => {
    if (!isOwner) return;
    await supabase.from('group_members').update({ role: 'admin' }).eq('group_id', id).eq('user_id', userId);
    setMemberSheet(null);
    invalidate();
  };

  const demote = async (userId: string) => {
    if (!isOwner) return;
    await supabase.from('group_members').update({ role: 'member' }).eq('group_id', id).eq('user_id', userId);
    setMemberSheet(null);
    invalidate();
  };

  const removeMember = (userId: string) => {
    Alert.alert('Remove Member', 'Remove this member from the group?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', userId);
          if (group.conversation_id) await supabase.from('conversation_members').delete().eq('conversation_id', group.conversation_id).eq('user_id', userId);
          setMemberSheet(null);
          invalidate();
        }
      }
    ]);
  };

  const searchUsers = async (q: string) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const { data: rows } = await supabase.from('profiles').select('id, full_name, avatar_url, is_verified').eq('is_bot', false).ilike('full_name', `%${q.trim()}%`).limit(20);
    const existing = new Set(members.map((m: any) => m.user_id));
    setSearchResults((rows || []).filter((r) => !existing.has(r.id)));
    setSearching(false);
  };

  const addMember = async (user: any) => {
    await supabase.from('group_members').insert({ group_id: id, user_id: user.id, role: 'member' });
    if (group.conversation_id) await supabase.from('conversation_members').insert({ conversation_id: group.conversation_id, user_id: user.id });
    setSearchQ('');
    setSearchResults([]);
    invalidate();
  };

  const leaveGroup = () => {
    if (isOwner) { Alert.alert('Owner cannot leave', 'Transfer ownership or delete the group.'); return; }
    Alert.alert('Leave Group', 'Leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
          await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', myId);
          if (group.conversation_id) await supabase.from('conversation_members').delete().eq('conversation_id', group.conversation_id).eq('user_id', myId);
          navigation.navigate('Groups');
        }
      }
    ]);
  };

  const deleteGroup = () => {
    if (!isOwner) return;
    Alert.alert('Delete Group', 'Delete this group permanently? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          if (group.conversation_id) {
            await supabase.from('conversation_members').delete().eq('conversation_id', group.conversation_id);
            await supabase.from('messages').delete().eq('conversation_id', group.conversation_id);
            await supabase.from('conversations').delete().eq('id', group.conversation_id);
          }
          await supabase.from('group_members').delete().eq('group_id', id);
          await supabase.from('groups').delete().eq('id', id);
          navigation.navigate('Groups');
        }
      }
    ]);
  };

  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;
  if (error || !group || !isAdmin) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#6d7382' }}>Not authorized</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Group settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        
        {/* COVER / ICON UPLOADER */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <TouchableOpacity style={styles.coverBtn} onPress={pickAndUploadCover} disabled={uploadingCover}>
            {group.cover_url ? (
              <Image source={{ uri: group.cover_url }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Ionicons name="people" size={40} color="#fff" />
            )}
            <View style={styles.coverOverlay}>
              <Ionicons name="camera" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 8 }}>{uploadingCover ? 'Uploading…' : 'Tap to change group icon'}</Text>
        </View>

        {/* GROUP INFO EDIT */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.label}>Group name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Group name" placeholderTextColor="#6d7382" />

          <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} multiline value={description} onChangeText={setDescription} placeholder="What is this group about?" placeholderTextColor="#6d7382" />

          <TouchableOpacity style={[styles.primaryBtn, (savingInfo || !name.trim()) && { opacity: 0.5 }]} onPress={saveInfo} disabled={savingInfo || !name.trim()}>
            <Text style={styles.primaryBtnText}>{savingInfo ? 'Saving…' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>

        {/* MEMBERS LIST */}
        <Text style={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8, fontSize: 13, color: '#6d7382' }}>{members.length} members</Text>
        {members.map((m: any) => (
          <TouchableOpacity key={m.user_id} style={styles.memberRow} onPress={() => setMemberSheet(m)}>
            <Image source={{ uri: m.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.profile?.full_name}` }} style={{ width: 42, height: 42, borderRadius: 21 }} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#fff' }}>{m.profile?.full_name || 'User'}{m.user_id === myId ? ' (you)' : ''}</Text>
              {m.role !== 'member' && <Text style={{ fontSize: 12, color: '#6d7382', textTransform: 'capitalize', marginTop: 2 }}>{m.role}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#1f1f1f" />
          </TouchableOpacity>
        ))}

        {/* ADD MEMBERS */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setAddSheet(true)}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>+ Add members</Text>
          </TouchableOpacity>
        </View>

        {/* DANGER ZONE */}
        <Text style={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8, fontSize: 13, color: '#6d7382' }}>Danger zone</Text>

        {!isOwner && (
          <TouchableOpacity style={styles.dangerRow} onPress={leaveGroup}>
            <Ionicons name="exit-outline" size={20} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '500', marginLeft: 16 }}>Leave group</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <TouchableOpacity style={styles.dangerRow} onPress={deleteGroup}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '500', marginLeft: 16 }}>Delete group</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* MEMBER ACTIONS SHEET */}
      <BottomSheet open={!!memberSheet} onClose={() => setMemberSheet(null)} maxHeight="50vh">
        {memberSheet && (
          <View style={{ padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{memberSheet.profile?.full_name}</Text>
              <Text style={{ fontSize: 13, color: '#6d7382', textTransform: 'capitalize', marginTop: 2 }}>{memberSheet.role}</Text>
            </View>

            {memberSheet.user_id !== myId && memberSheet.role !== 'owner' && isOwner && (
              memberSheet.role === 'admin' ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => demote(memberSheet.user_id)}>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionText}>Dismiss as admin</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={() => promote(memberSheet.user_id)}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionText}>Promote to admin</Text>
                </TouchableOpacity>
              )
            )}

            {memberSheet.user_id !== myId && memberSheet.role !== 'owner' && isAdmin && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 10 }]} onPress={() => removeMember(memberSheet.user_id)}>
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.actionText}>Remove from group</Text>
              </TouchableOpacity>
            )}

            {memberSheet.user_id === myId && (
              <Text style={{ textAlign: 'center', color: '#6d7382', fontSize: 13, paddingVertical: 10 }}>This is you</Text>
            )}
          </View>
        )}
      </BottomSheet>

      {/* ADD MEMBER SEARCH SHEET */}
      <BottomSheet open={addSheet} onClose={() => setAddSheet(false)} maxHeight="80vh">
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 16 }}>Add members</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#6d7382" />
            <TextInput style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }} placeholder="Search by name" placeholderTextColor="#6d7382" value={searchQ} onChangeText={searchUsers} />
          </View>

          <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
            {searching && <Text style={{ textAlign: 'center', color: '#6d7382', paddingVertical: 16 }}>Searching…</Text>}
            {!searching && searchQ && searchResults.length === 0 && <Text style={{ textAlign: 'center', color: '#6d7382', paddingVertical: 16 }}>No users found</Text>}
            {searchResults.map((u, i) => (
              <TouchableOpacity key={u.id} style={[styles.memberRow, i === 0 && { borderTopWidth: 0 }]} onPress={() => addMember(u)}>
                <Image source={{ uri: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name}` }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: '500', marginLeft: 12 }}>{u.full_name || 'User'}</Text>
                <Ionicons name="add-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>

    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  coverBtn: { width: 96, height: 96, borderRadius: 20, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500', color: '#fff', marginBottom: 8 },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1f1f1f' },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  outlineBtn: { borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 10, padding: 14, alignItems: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  dangerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#141414', padding: 16, borderRadius: 16 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
});
