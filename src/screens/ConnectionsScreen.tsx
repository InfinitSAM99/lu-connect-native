import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import VerifiedBadge from '../components/VerifiedBadge';

const PAGE = 15;

function shuffle(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadRequestsAndSent(profileId: string) {
  const [incomingReqsRes, sentReqsRes] = await Promise.all([
    supabase.from('connections').select('id, requester_id, created_at').eq('receiver_id', profileId).eq('status', 'pending'),
    supabase.from('connections').select('id, receiver_id, created_at').eq('requester_id', profileId).eq('status', 'pending'),
  ]);

  const incomingIds = (incomingReqsRes.data || []).map((r) => r.requester_id);
  const sentIds = (sentReqsRes.data || []).map((r) => r.receiver_id);
  const allIds = [...new Set([...incomingIds, ...sentIds])];

  let profileMap: Record<string, any> = {};
  if (allIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, year_of_study, is_verified, is_broadcast_only').eq('is_bot', false).in('id', allIds);
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });
  }

  const incoming = (incomingReqsRes.data || []).map((r) => ({ connection_id: r.id, profile: profileMap[r.requester_id], created_at: r.created_at })).filter((x) => x.profile);
  const sent = (sentReqsRes.data || []).map((r) => ({ connection_id: r.id, profile: profileMap[r.receiver_id], created_at: r.created_at })).filter((x) => x.profile);

  return { incoming, sent };
}

async function loadSuggestions(profileId: string, myProfile?: any) {
  const [myConns, myFollows] = await Promise.all([
    supabase.from('connections').select('requester_id, receiver_id').or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`),
    supabase.from('follows').select('following_id').eq('follower_id', profileId),
  ]);

  const excludeIds = new Set([profileId]);
  for (const c of myConns.data || []) excludeIds.add(c.requester_id === profileId ? c.receiver_id : c.requester_id);
  for (const f of myFollows.data || []) if (f.following_id) excludeIds.add(f.following_id);

  const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url, year_of_study, is_verified, is_broadcast_only, is_bot').eq('is_bot', false).order('created_at', { ascending: false }).limit(300);

  const filtered = (allProfiles || []).filter((p: any) => !excludeIds.has(p.id));
  
  // RANK SUGGESTIONS
  const scored = filtered.map((p: any) => {
    let score = 0;
    if (myProfile?.residence && p.residence && p.residence.toLowerCase() === myProfile.residence.toLowerCase()) score += 100;
    if (myProfile?.faculty && p.faculty && p.faculty.toLowerCase() === myProfile.faculty.toLowerCase()) score += 80;
    if (myProfile?.year_of_study && p.year_of_study && p.year_of_study === myProfile.year_of_study) score += 30;
    if (p.is_verified) score += 20;
    score += Math.floor(Math.random() * 10);
    return { ...p, _score: score };
  });

  scored.sort((a: any, b: any) => b._score - a._score);
  return scored;
}

export default function ConnectionsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const myId = profile?.id || null;
  const isProfessional = !!profile?.professional_mode;

  const [tab, setTab] = useState<'find' | 'requests' | 'sent'>('find');
  const [visibleCount, setVisibleCount] = useState(PAGE);

  const reqQuery = useQuery({ queryKey: ['connections-req', myId], enabled: !!myId, staleTime: 30000, queryFn: () => loadRequestsAndSent(myId) });
  const suggestQuery = useQuery({ queryKey: ['connections-suggest', myId], enabled: !!myId, staleTime: 60000, queryFn: () => loadSuggestions(myId) });

  const incoming = reqQuery.data?.incoming || [];
  const sent = reqQuery.data?.sent || [];
  const suggestedPool = suggestQuery.data || [];
  const loading = reqQuery.isLoading || suggestQuery.isLoading;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['connections-req', myId] });
    queryClient.invalidateQueries({ queryKey: ['connections-suggest', myId] });
  };

  const accept = async (connId: string, requesterId: string) => {
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', connId);
    await supabase.from('notifications').insert({
      user_id: requesterId,
      actor_id: profile.id,
      type: 'connection_accepted',
      title: `${profile.full_name} accepted your connection`,
      link: `/profile/${profile.id}`,
    });
    invalidate();
  };

  const reject = async (connId: string) => {
    await supabase.from('connections').update({ status: 'rejected' }).eq('id', connId);
    invalidate();
  };

  const cancelRequest = (connId: string) => {
    Alert.alert('Cancel Request', 'Cancel this connection request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
          await supabase.from('connections').delete().eq('id', connId);
          invalidate();
      }}
    ]);
  };

  const sendConnection = async (targetId: string) => {
    await supabase.from('connections').insert({ requester_id: profile.id, receiver_id: targetId, status: 'pending' });
    await supabase.from('notifications').insert({
      user_id: targetId,
      actor_id: profile.id,
      type: 'connection_request',
      title: `${profile.full_name} wants to connect`,
      link: `/profile/${profile.id}`,
    });
    invalidate();
  };

  const followUser = async (targetId: string) => {
    await supabase.from('follows').insert({ follower_id: profile.id, following_id: targetId });
    invalidate();
  };

  const tabs = [
    { key: 'find', label: 'Find', count: 0 },
    { key: 'requests', label: 'Requests', count: incoming.length },
    { key: 'sent', label: 'Sent', count: sent.length },
  ] as const;

  const renderRow = (p: any, actions: React.ReactNode) => (
    <View key={p.id} style={styles.row}>
      <TouchableOpacity onPress={() => navigation.navigate('Profile', { id: p.id })}>
        {p.avatar_url ? (
          <Image source={{ uri: p.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>{p.full_name?.[0] || 'U'}</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { id: p.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }} numberOfLines={1}>{p.full_name}</Text>
          {p.is_verified && <VerifiedBadge size={15} />}
        </TouchableOpacity>
        <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>
          {p.year_of_study ? `Year ${p.year_of_study}` : 'Student'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{actions}</View>
    </View>
  );

  const visibleSuggested = suggestedPool.slice(0, visibleCount);
  const hasMore = visibleCount < suggestedPool.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar 
        hero 
        title="Network" 
        subtitle="Connect with students across campus"
        showBack={false} 
        rightComponent={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <TouchableOpacity onPress={() => navigation.navigate("QRScanner")}>
              <Ionicons name="qr-code-outline" size={32} color="#FFD700" />
            </TouchableOpacity>
            <Ionicons name="people" size={48} color="#ef4444" style={{ marginTop: 4 }} />
          </View>
        } 
      />

      {/* TABS */}
      <View style={styles.tabsContainer}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}{t.count > 0 ? ` ${t.count}` : ''}
            </Text>
            {tab === t.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {loading ? (
          <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* FIND TAB */}
            {tab === 'find' && (
              <>
                {suggestedPool.length === 0 && (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 }}>No new students to show</Text>
                    <Text style={{ color: '#6d7382', fontSize: 13 }}>You've connected with everyone here.</Text>
                  </View>
                )}

                {visibleSuggested.map((p: any) =>
                  renderRow(p, isProfessional ? (
                    <TouchableOpacity onPress={() => followUser(p.id)} style={styles.pillPrimary}>
                      <Text style={styles.pillPrimaryText}>Follow</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => sendConnection(p.id)} style={styles.pillPrimary}>
                      <Text style={styles.pillPrimaryText}>Connect</Text>
                    </TouchableOpacity>
                  ))
                )}

                {hasMore && (
                  <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
                    <TouchableOpacity onPress={() => setVisibleCount((v) => v + PAGE)} style={styles.loadMoreBtn}>
                      <Text style={styles.pillPrimaryText}>Load more</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!hasMore && suggestedPool.length > 0 && (
                  <Text style={{ color: '#6d7382', textAlign: 'center', padding: 20 }}>You've seen everyone for now.</Text>
                )}
              </>
            )}

            {/* REQUESTS TAB */}
            {tab === 'requests' && (
              <>
                {incoming.length === 0 && (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 }}>No pending requests</Text>
                    <Text style={{ color: '#6d7382', fontSize: 13 }}>When someone wants to connect, they'll appear here.</Text>
                  </View>
                )}
                {incoming.map((c: any) =>
                  renderRow(c.profile, (
                    <>
                      <TouchableOpacity onPress={() => accept(c.connection_id, c.profile.id)} style={styles.pillPrimary}>
                        <Text style={styles.pillPrimaryText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => reject(c.connection_id)} style={styles.pillGhost}>
                        <Text style={styles.pillGhostText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  ))
                )}
              </>
            )}

            {/* SENT TAB */}
            {tab === 'sent' && (
              <>
                {sent.length === 0 && (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 }}>No sent requests</Text>
                    <Text style={{ color: '#6d7382', fontSize: 13 }}>Search for friends to send a request.</Text>
                  </View>
                )}
                {sent.map((c: any) =>
                  renderRow(c.profile, (
                    <TouchableOpacity onPress={() => cancelRequest(c.connection_id)} style={styles.pillGhost}>
                      <Text style={styles.pillGhostText}>Cancel</Text>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 28 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  tabsContainer: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', paddingHorizontal: 20 },
  tabBtn: { paddingVertical: 10, position: 'relative' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6d7382' },
  tabTextActive: { color: '#ef4444', fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: '#ef4444' },
  pillPrimary: { backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  pillPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pillGhost: { borderWidth: 1.5, borderColor: '#1f1f1f', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  pillGhostText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  loadMoreBtn: { backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 20 },
});
