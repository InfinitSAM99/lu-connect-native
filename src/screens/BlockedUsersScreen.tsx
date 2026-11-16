import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import Toast from 'react-native-toast-message';

export default function BlockedUsersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlocked = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('blocked_users')
        .select('*, blocked:blocked_id(id, full_name, avatar_url)')
        .eq('blocker_id', profile.id);
      if (data) setBlocked(data);
      setLoading(false);
    };
    fetchBlocked();
  }, [profile?.id]);

  const unblock = async (blockId: string) => {
    await supabase.from('blocked_users').delete().eq('id', blockId);
    setBlocked(prev => prev.filter(b => b.id !== blockId));
    Toast.show({ type: 'success', text1: 'User Unblocked' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Blocked Users" showBack={true} onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color="#ef4444" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom }}>
          {blocked.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="shield-checkmark" size={64} color="#22c55e" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>No Blocked Users</Text>
              <Text style={{ color: '#6d7382', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
                You haven't blocked anyone. Your account is safe.
              </Text>
            </View>
          ) : (
            blocked.map((b) => (
              <View key={b.id} style={styles.row}>
                <Image source={{ uri: b.blocked?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${b.blocked?.full_name}` }} style={styles.avatar} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, marginLeft: 12 }}>{b.blocked?.full_name}</Text>
                <TouchableOpacity style={styles.unblockBtn} onPress={() => unblock(b.id)}>
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1f1f1f' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  unblockBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ef4444' },
});
