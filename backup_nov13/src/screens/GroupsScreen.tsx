import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import VerifiedBadge from '../components/VerifiedBadge';
import BottomSheet from '../components/BottomSheet';

async function loadGroups(profileId: string, faculty?: string, residence?: string) {
  const [mineRes, allRes] = await Promise.all([
    supabase.from('group_members').select('group_id').eq('user_id', profileId),
    supabase.from('groups').select('id, name, description, cover_url, category, faculty, year_of_study, member_count, privacy, is_official, conversation_id').eq('privacy', 'public').eq('is_archived', false).order('member_count', { ascending: false }).limit(200),
  ]);
  const myIds = new Set((mineRes.data || []).map((m: any) => m.group_id));
  const groups = allRes.data || [];

  // RANK GROUPS
  const scored = groups.map((g: any) => {
    let score = 0;
    if (g.is_official) score += 1000;
    if (myIds.has(g.id)) score += 500;
    if (residence && g.description?.toLowerCase().includes(residence.toLowerCase())) score += 100;
    if (faculty && g.faculty?.toLowerCase().includes(faculty.toLowerCase())) score += 80;
    score += Math.min(100, g.member_count || 0);
    score += Math.floor(Math.random() * 20);
    return { ...g, _score: score };
  });

  scored.sort((a: any, b: any) => b._score - a._score);

  return {
    myIds,
    allGroups: scored,
  };
}

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'faculty': return 'school';
    case 'year': return 'calendar';
    case 'club': return 'star';
    case 'course': return 'book';
    default: return 'people';
  }
};

const EMPTY_FORM = { name: '', description: '', category: 'general', faculty: '', year_of_study: '', privacy: 'public' };

export default function GroupsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id;

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [joinTarget, setJoinTarget] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  const queryKey = ['groups', myId];
  const { data, isLoading } = useQuery({ queryKey, enabled: !!myId, staleTime: 60000, queryFn: () => loadGroups(myId) });

  const myIds = data?.myIds || new Set();
  const groups = data?.allGroups || [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const confirmJoin = async () => {
    if (!joinTarget || joining) return;
    setJoining(true);
    const g = joinTarget;
    let conversationId = g.conversation_id;
    if (!conversationId) {
      const { data: conv } = await supabase.from('conversations').insert({ is_group: true, name: g.name, created_by: profile.id }).select().single();
      if (conv) {
        conversationId = conv.id;
        await supabase.from('groups').update({ conversation_id: conv.id }).eq('id', g.id);
      }
    }
    await supabase.from('group_members').insert({ group_id: g.id, user_id: profile.id, role: 'member' });
    if (conversationId) {
      await supabase.from('conversation_members').insert({ conversation_id: conversationId, user_id: profile.id });
    }
    setJoining(false);
    setJoinTarget(null);
    invalidate();
    if (conversationId) navigation.navigate('Conversation', { id: conversationId });
  };

  const leave = (gid: string) => {
    Alert.alert('Leave Group', 'Leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
          const g = groups.find((x: any) => x.id === gid);
          await supabase.from('group_members').delete().eq('group_id', gid).eq('user_id', profile.id);
          if (g?.conversation_id) await supabase.from('conversation_members').delete().eq('conversation_id', g.conversation_id).eq('user_id', profile.id);
          invalidate();
        }
      }
    ]);
  };

  const createGroup = async () => {
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    const { data: g, error } = await supabase.from('groups').insert({
      name: form.name.trim(), slug, description: form.description, category: form.category,
      faculty: form.faculty || null, year_of_study: form.year_of_study ? Number(form.year_of_study) : null,
      privacy: form.privacy, created_by: profile.id, is_official: false,
    }).select().single();

    if (error) { Alert.alert('Error', error.message); setSubmitting(false); return; }

    const { data: conv } = await supabase.from('conversations').insert({ is_group: true, name: g.name, created_by: profile.id }).select().single();
    if (conv) {
      await supabase.from('groups').update({ conversation_id: conv.id }).eq('id', g.id);
      await supabase.from('conversation_members').insert({ conversation_id: conv.id, user_id: profile.id });
    }
    await supabase.from('group_members').insert({ group_id: g.id, user_id: profile.id, role: 'owner' });
    setSubmitting(false);
    setCreating(false);
    setForm(EMPTY_FORM);
    invalidate();
    if (conv?.id) navigation.navigate('Conversation', { id: conv.id });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar centeredHero title="Groups" subtitle="Find your people. Join a faculty, year, or club." centerIcon={<Ionicons name="people" size={72} color="#ef4444" />} showBack={false} />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {isLoading ? (
          <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} />
        ) : groups.length === 0 ? (
          <Text style={{ color: '#6d7382', textAlign: 'center', padding: 48 }}>No groups yet</Text>
        ) : (
          groups.map((g: any, i: number) => {
            const isMember = myIds.has(g.id);
            return (
              <View key={g.id} style={styles.row}>
                <TouchableOpacity style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }} onPress={() => navigation.navigate(isMember && g.conversation_id ? 'Conversation' : 'GroupDetail', { id: isMember ? g.conversation_id : g.id })}>
                  <View style={styles.groupIcon}>
                    <Ionicons name={getCategoryIcon(g.category)} size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#fff' }} numberOfLines={1}>{g.name}</Text>
                    <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }} numberOfLines={1}>
                      {g.member_count || 1} members{g.category ? ` · ${g.category}` : ''}{g.faculty ? ` · ${g.faculty}` : ''}{g.year_of_study ? ` · Year ${g.year_of_study}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isMember ? (
                  <TouchableOpacity onPress={() => leave(g.id)} style={styles.outlinePill}><Text style={styles.outlinePillText}>Leave</Text></TouchableOpacity>
                ) : g.privacy === 'public' ? (
                  <TouchableOpacity onPress={() => setJoinTarget(g)} style={styles.redPill}><Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Join</Text></TouchableOpacity>
                ) : (
                  <Text style={{ fontSize: 12, color: '#6d7382' }}>Invite only</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setCreating(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* JOIN SHEET */}
      <BottomSheet open={!!joinTarget} onClose={() => setJoinTarget(null)} maxHeight="40vh">
        {joinTarget && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 }}>Join {joinTarget.name}?</Text>
            <Text style={{ fontSize: 14, color: '#6d7382', textAlign: 'center', marginBottom: 24 }}>{joinTarget.description || 'Join this group to see posts and chat.'}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={confirmJoin} disabled={joining}>
              <Text style={styles.primaryBtnText}>{joining ? 'Joining...' : 'Confirm Join'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* CREATE SHEET */}
      <BottomSheet open={creating} onClose={() => setCreating(false)} maxHeight="92vh">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 }}>New group</Text>
          <Text style={{ fontSize: 13, color: '#6d7382', textAlign: 'center', marginBottom: 28 }}>Create a space for your faculty, year, or club</Text>

          <Text style={styles.label}>Group name</Text>
          <TextInput style={styles.input} placeholder="e.g., Faculty of Science" placeholderTextColor="#6d7382" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />

          <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
          <TextInput style={[styles.input, { height: 84, textAlignVertical: 'top' }]} multiline placeholder="What is this group about?" placeholderTextColor="#6d7382" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

          <Text style={[styles.label, { marginTop: 14 }]}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {['general', 'faculty', 'year', 'course', 'club'].map((c) => (
              <TouchableOpacity key={c} style={[styles.categoryChip, form.category === c && styles.categoryChipActive]} onPress={() => setForm({ ...form, category: c })}>
                <Text style={{ color: form.category === c ? '#fff' : '#6d7382', fontSize: 13, textTransform: 'capitalize' }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.category === 'faculty' && (
            <>
              <Text style={styles.label}>Faculty</Text>
              <TextInput style={styles.input} placeholder="e.g., Science" placeholderTextColor="#6d7382" value={form.faculty} onChangeText={(v) => setForm({ ...form, faculty: v })} />
            </>
          )}

          {form.category === 'year' && (
            <>
              <Text style={styles.label}>Year</Text>
              <TextInput style={styles.input} keyboardType="number-pad" placeholder="1–6" placeholderTextColor="#6d7382" value={form.year_of_study} onChangeText={(v) => setForm({ ...form, year_of_study: v })} />
            </>
          )}

          <Text style={[styles.label, { marginTop: 14 }]}>Privacy</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
            <TouchableOpacity style={[styles.categoryChip, form.privacy === 'public' && styles.categoryChipActive]} onPress={() => setForm({ ...form, privacy: 'public' })}>
              <Text style={{ color: form.privacy === 'public' ? '#fff' : '#6d7382', fontSize: 13 }}>Public</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.categoryChip, form.privacy === 'private' && styles.categoryChipActive]} onPress={() => setForm({ ...form, privacy: 'private' })}>
              <Text style={{ color: form.privacy === 'private' ? '#fff' : '#6d7382', fontSize: 13 }}>Private</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={createGroup} disabled={submitting}>
            <Text style={styles.primaryBtnText}>{submitting ? 'Creating...' : 'Create group'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  groupIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  redPill: { backgroundColor: '#ef4444', paddingHorizontal: 18, paddingVertical: 7, borderRadius: 18 },
  outlinePill: { borderWidth: 1, borderColor: '#1f1f1f', paddingHorizontal: 18, paddingVertical: 7, borderRadius: 18 },
  outlinePillText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  fab: { position: 'absolute', right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', color: '#fff', marginBottom: 8 },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1f1f1f' },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1f1f1f', backgroundColor: '#0a0a0a' },
  categoryChipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
});
