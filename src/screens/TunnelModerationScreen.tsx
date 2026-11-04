import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import TopBar from '../components/TopBar';

export default function TunnelModerationScreen({ route, navigation }: any) {
  const { tunnelId, tunnelName } = route.params;
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['moderate-tunnel', tunnelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tunnel_posts')
        .select('*, profiles:author_id(full_name)')
        .eq('tunnel_id', tunnelId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const flagPost = async (post: any) => {
    await supabase.from('tunnel_posts').update({ is_flagged: !post.is_flagged }).eq('id', post.id);
    queryClient.invalidateQueries({ queryKey: ['moderate-tunnel', tunnelId] });
    queryClient.invalidateQueries({ queryKey: ['tunnel-posts', tunnelId] });
  };

  const deletePost = async (post: any) => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('tunnel_posts').delete().eq('id', post.id);
        queryClient.invalidateQueries({ queryKey: ['moderate-tunnel', tunnelId] });
        queryClient.invalidateQueries({ queryKey: ['tunnel-posts', tunnelId] });
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title={`Moderate: ${tunnelName}`} showBack={true} onBack={() => navigation.goBack()} />
      <FlatList
        data={posts || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No posts in this tunnel.</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#0a0a0a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: item.is_flagged ? '#ef4444' : '#1f1f1f' }}>
            <Text style={{ color: '#6d7382', fontSize: 11, marginBottom: 6 }}>{item.profiles?.full_name || 'Anonymous'}</Text>
            <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>{item.content}</Text>
            {item.image_url && <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 150, borderRadius: 8, marginBottom: 8 }} />}
            {item.is_flagged && <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700', marginBottom: 8 }}>⚠️ FLAGGED</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => flagPost(item)} style={{ flex: 1, backgroundColor: item.is_flagged ? '#f59e0b' : '#141414', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{item.is_flagged ? 'Unflag' : 'Flag'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deletePost(item)} style={{ flex: 1, backgroundColor: '#7f1d1d', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
