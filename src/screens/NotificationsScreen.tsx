import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import VerifiedBadge from '../components/VerifiedBadge';

const SECTIONS = [
  { key: 'comments', label: 'Comments', color: '#22c55e', icon: 'chatbubble', types: ['comment', 'reply', 'mention'] },
  { key: 'likes', label: 'Likes', color: '#ef4444', icon: 'heart', types: ['like'] },
  { key: 'announcements', label: 'Announcements', color: '#eab308', icon: 'megaphone', types: ['announcement'] },
  { key: 'groups', label: 'Groups', color: '#3b82f6', icon: 'people', types: ['group_message', 'group_post', 'group_invite'] },
  { key: 'events', label: 'Events', color: '#f97316', icon: 'calendar', types: ['event'] },
  { key: 'verification', label: 'Verification', color: '#22c55e', icon: 'checkmark-circle', types: ['verify', 'verification', 'account'] },
  { key: 'boosts', label: 'Boosts', color: '#ef4444', icon: 'flame', types: ['boost', 'boost_approved', 'boost_rejected', 'boost_delivered'] },
  { key: 'other', label: 'Other activity', color: '#6d7382', icon: 'notifications', types: ['connection_request', 'connection_accepted', 'message', 'system', 'report_update'] },
];

function sectionForType(type: string) {
  return SECTIONS.find((s) => s.types.includes(type)) || SECTIONS.find((s) => s.key === 'other');
}

async function loadNotifications(userId: string) {
  const { data, error } = await supabase.from('notifications').select('id, type, title, body, link, actor_id, reference_id, is_read, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(300);
  if (error) throw new Error(error.message);

  const actorIds = [...new Set((data || []).map((n) => n.actor_id).filter(Boolean))];
  const actorMap: Record<string, any> = {};
  const botIds = new Set();

  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from('profiles').select('id, full_name, avatar_url, is_broadcast_only, is_bot').in('id', actorIds);
    (actors || []).forEach((a) => {
      if (a.is_bot) botIds.add(a.id);
      else actorMap[a.id] = a;
    });
  }

  return (data || []).filter((n) => !n.actor_id || !botIds.has(n.actor_id)).map((n) => ({ ...n, actor: actorMap[n.actor_id] || null }));
}

export default function NotificationsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  
  const [errMsg, setErrMsg] = useState('');
  const queryKey = ['notifications', profile?.id];
  const notifQuery = useQuery({ queryKey, enabled: !!profile?.id, staleTime: 30000, queryFn: () => loadNotifications(profile.id) });

  const items = notifQuery.data || [];
  const loading = notifQuery.isLoading;

  useEffect(() => {
    if (notifQuery.error) setErrMsg(notifQuery.error.message);
  }, [notifQuery.error]);

  useEffect(() => {
    if (!profile?.id) return;
    const channelName = `notif-page-${profile.id}-${Date.now()}`;
    const channel = supabase.channel(channelName).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
      queryClient.invalidateQueries({ queryKey });
    });
    const timer = setTimeout(() => { channel.subscribe(); }, 100);
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, [profile?.id, queryClient]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const unreadBySection: Record<string, number> = {};
  const totalBySection: Record<string, number> = {};
  SECTIONS.forEach((s) => {
    const sectionItems = items.filter((n: any) => sectionForType(n.type).key === s.key);
    totalBySection[s.key] = sectionItems.length;
    unreadBySection[s.key] = sectionItems.filter((n: any) => !n.is_read).length;
  });
  const totalUnread = items.filter((n: any) => !n.is_read).length;

  const markAllRead = async () => {
    if (totalUnread === 0) return;
    queryClient.setQueryData(queryKey, (old: any) => old ? old.map((n: any) => ({ ...n, is_read: true })) : old);
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    invalidate();
  };

  const openSection = (section: any) => {
    const sectionItems = items.filter((n: any) => sectionForType(n.type).key === section.key);
    navigation.navigate('NotificationList', { section, items: sectionItems });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar 
        centeredHero
        title="Notifications" 
        subtitle={totalUnread > 0 ? `${totalUnread} unread · tap a section to view` : 'You are all caught up'}
        showBack={false}
        centerIcon={<Ionicons name="notifications" size={72} color="#ef4444" />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}>
        
        {errMsg ? <View style={styles.errBox}><Text style={{ color: '#fff', fontSize: 13 }}>{errMsg}</Text></View> : null}

        {loading ? (
          <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} />
        ) : (
          <View style={{ paddingVertical: 8 }}>
            {SECTIONS.map((s) => (
              <TouchableOpacity 
                key={s.key} 
                style={styles.sectionRow} 
                onPress={() => openSection(s)}
              >
                <View style={{ width: 32, alignItems: 'flex-start' }}>
                  <Ionicons name={s.icon as any} size={24} color={s.color} />
                </View>
                
                <Text style={styles.sectionTitle}>{s.label}</Text>
                
                <Text style={styles.sectionCount}>{totalBySection[s.key]}</Text>
                
                {unreadBySection[s.key] > 0 ? (
                  <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unreadBySection[s.key] > 99 ? '99+' : unreadBySection[s.key]}</Text></View>
                ) : (
                  <View style={{ width: 24, marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && items.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 28 }}>
            <TouchableOpacity style={[styles.markAllBtn, totalUnread === 0 && { opacity: 0.5 }]} onPress={markAllRead} disabled={totalUnread === 0}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  errBox: { backgroundColor: '#7f1d1d', padding: 10, borderRadius: 8, marginHorizontal: 16, marginBottom: 12 },
  
  // Clean row with NO dividers, but still spacious
  sectionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 18, 
    paddingHorizontal: 16,
    // borderBottomWidth: 1,  <--- REMOVED
    // borderBottomColor: '#1f1f1f', <--- REMOVED
  },
  sectionTitle: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#fff', 
    marginLeft: 16 
  },
  sectionCount: { 
    fontSize: 13, 
    color: '#6d7382', 
    minWidth: 30, 
    textAlign: 'right' 
  },
  unreadBadge: { 
    backgroundColor: '#ef4444', 
    borderRadius: 12, 
    paddingHorizontal: 9, 
    paddingVertical: 2, 
    minWidth: 24, 
    alignItems: 'center', 
    marginLeft: 6 
  },
  unreadText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  markAllBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    backgroundColor: '#ef4444', 
    padding: 16, 
    borderRadius: 16 
  },
});
