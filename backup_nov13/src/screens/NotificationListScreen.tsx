import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomSheet from '../components/BottomSheet';
import VerifiedBadge from '../components/VerifiedBadge';

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationListScreen({ route, navigation }: any) {
  const { section, items: initialItems } = route.params;
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  
  const [items, setItems] = useState(initialItems);
  const [rowTarget, setRowTarget] = useState<any>(null);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

  // Helper to refresh the main Notifications screen cache
  const refreshMainCache = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
  };

  const handleTap = async (n: any) => {
    if (!n.is_read) {
      setItems((prev: any[]) => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      refreshMainCache();
    }
  };

  const handleBulkDelete = async () => {
    if (!isConfirmingBulkDelete) {
      setIsConfirmingBulkDelete(true);
      setTimeout(() => setIsConfirmingBulkDelete(false), 3000);
      return;
    }

    const idsToDelete = items.map((i: any) => i.id);
    if (idsToDelete.length > 0) {
      setItems([]);
      await supabase.from('notifications').delete().in('id', idsToDelete);
      refreshMainCache(); // <--- Updates the main screen counts
    }
    setIsConfirmingBulkDelete(false);
  };

  const handleSingleDelete = async (n: any) => {
    setItems((prev: any[]) => prev.filter(x => x.id !== n.id));
    await supabase.from('notifications').delete().eq('id', n.id);
    setRowTarget(null);
    refreshMainCache(); // <--- Updates the main screen counts
  };

  const handleToggleRead = async (n: any) => {
    const newStatus = !n.is_read;
    setItems((prev: any[]) => prev.map(x => x.id === n.id ? { ...x, is_read: newStatus } : x));
    await supabase.from('notifications').update({ is_read: newStatus }).eq('id', n.id);
    setRowTarget(null);
    refreshMainCache(); // <--- Updates the main screen counts
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Ionicons name={section.icon} size={26} color={section.color} />
        <Text style={styles.headerTitle}>{section.label}</Text>
        <Text style={styles.headerCount}>{items.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {items.length === 0 && (
          <Text style={{ color: '#6d7382', textAlign: 'center', padding: 40, fontSize: 13 }}>Nothing here</Text>
        )}
        {items.map((n: any) => (
          <View key={n.id} style={styles.row}>
            <TouchableOpacity style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }} onPress={() => handleTap(n)}>
              {n.actor?.avatar_url ? (
                <Image source={{ uri: n.actor.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name={section.icon} size={22} color={section.color} />
                </View>
              )}
              
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 15, lineHeight: 20, color: '#fff', fontWeight: !n.is_read ? '700' : '500' }}>{n.title}</Text>
                {n.body && <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 3 }} numberOfLines={2}>{n.body}</Text>}
              </View>

              <View style={{ alignItems: 'flex-end', gap: 6, marginRight: 8 }}>
                <Text style={{ fontSize: 12, color: '#6d7382' }}>{timeAgo(n.created_at)}</Text>
                {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />}
              </View>
            </TouchableOpacity>

            {/* 3-Dot Menu */}
            <TouchableOpacity onPress={() => setRowTarget(n)} style={{ padding: 8 }}>
              <Ionicons name="ellipsis-vertical" size={20} color="#6d7382" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* FLOATING BULK DELETE BUTTON */}
      {items.length > 0 && (
        <TouchableOpacity 
          style={[
            styles.fab, 
            { bottom: insets.bottom + 20 },
            isConfirmingBulkDelete && { backgroundColor: '#991b1b', width: 140 }
          ]} 
          onPress={handleBulkDelete}
          activeOpacity={0.8}
        >
          <Ionicons name={isConfirmingBulkDelete ? "alert-circle" : "trash"} size={20} color="#fff" />
          {isConfirmingBulkDelete && <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>Confirm</Text>}
        </TouchableOpacity>
      )}

      {/* SINGLE ITEM ACTION SHEET */}
      <BottomSheet open={!!rowTarget} onClose={() => setRowTarget(null)} maxHeight="35vh">
        <View style={{ padding: 20, paddingBottom: 40 }}>
          <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 20 }}>
            {rowTarget?.title}
          </Text>
          
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleRead(rowTarget)}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionText}>{rowTarget?.is_read ? 'Mark as unread' : 'Mark as read'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 12 }]} onPress={() => handleSingleDelete(rowTarget)}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionText}>Delete this notification</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, marginLeft: 10 },
  headerCount: { fontSize: 13, color: '#6d7382' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#141414', padding: 16, borderRadius: 16 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#ef4444',
    height: 56,
    width: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  }
});
