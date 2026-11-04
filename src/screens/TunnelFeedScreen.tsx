import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

export default function TunnelFeedScreen({ route, navigation }: any) {
  const { tunnelId, tunnelName } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isAdmin = profile?.email === 'adminsammy@admin.com';

  const [activeTab, setActiveTab] = useState<'discuss' | 'vote'>('discuss');
  const [modalOpen, setModalOpen] = useState(false);
  const [postType, setPostType] = useState<'secret' | 'poll'>('secret');
  const [content, setContent] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Tunnel Rules
  const { data: tunnelData } = useQuery({
    queryKey: ['tunnel-details', tunnelId],
    queryFn: async () => {
      const { data } = await supabase.from('tunnels').select('*').eq('id', tunnelId).single();
      return data;
    },
  });

  // 2. Fetch Posts (Force Refresh via QueryKey)
  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['tunnel-posts', tunnelId, activeTab],
    queryFn: async () => {
      // Use explicit foreign key hint for profiles
      let query = supabase
        .from('tunnel_posts')
        .select('*, profiles!author_id(full_name, avatar_url)')
        .eq('tunnel_id', tunnelId);
        
      if (activeTab === 'discuss') query = query.eq('post_type', 'secret');
      else query = query.eq('post_type', 'poll');
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Tunnel posts fetch error:', error);
      }
      
      return data || [];
    },
  });


  // Fetch total members in the tunnel to show turnout
  const { data: tunnelMembers } = useQuery({
    queryKey: ['tunnel-member-count', tunnelId],
    queryFn: async () => {
      const { count } = await supabase.from('tunnel_members').select('*', { count: 'exact', head: true }).eq('tunnel_id', tunnelId);
      return count || 0;
    }
  });

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const submitPost = async () => {
    if (!content.trim()) return Alert.alert('Error', 'Content is required');
    if (postType === 'secret' && !imageUri) return Alert.alert('Error', 'An image is required for secrets');

    setSubmitting(true);
    try {
      let finalImageUrl = null;
      if (imageUri) {
        const ext = imageUri.split('.').pop() || 'jpg';
        const path = `tunnels/${tunnelId}/${Date.now()}.${ext}`;
        const blob = await (await fetch(imageUri)).blob();
        await supabase.storage.from('messages').upload(path, blob, { contentType: 'image/jpeg' });
        const { data: { publicUrl } } = supabase.storage.from('messages').getPublicUrl(path);
        finalImageUrl = publicUrl;
      }

      const { error } = await supabase.from('tunnel_posts').insert({
        tunnel_id: tunnelId,
        author_id: profile!.id,
        content: content.trim(),
        image_url: finalImageUrl,
        post_type: postType,
        poll_options: postType === 'poll' ? pollOptions.filter(o => o.trim() !== '') : null,
      });
      
      if (error) throw error;

      // Close modal, clear fields, and force reload
      setModalOpen(false); 
      setContent(''); 
      setImageUri(null); 
      setPollOptions(['', '']);
      
      // Force React Query to refetch the list immediately
      await queryClient.invalidateQueries({ queryKey: ['tunnel-posts', tunnelId] });
      await refetch();
      
    } catch (e: any) { 
      Alert.alert('Error', e.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const deletePost = async (id: string) => {
    Alert.alert('Delete', 'Delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('tunnel_posts').delete().eq('id', id);
        await refetch();
      }},
    ]);
  };


  const castVote = async (post: any, optionIndex: number) => {
    if (!profile?.id) return;
    
    // Allow changing votes (overwrite the user's previous vote)
    const currentVotes = post.votes_data || {};
    const newVotes = { ...currentVotes, [profile.id]: optionIndex };
    
    // Optimistic UI update
    queryClient.setQueryData(['tunnel-posts', tunnelId, activeTab], (old: any) => 
      old?.map((p: any) => p.id === post.id ? { ...p, votes_data: newVotes } : p)
    );

    // DB Update
    await supabase.from('tunnel_posts').update({ votes_data: newVotes }).eq('id', post.id);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TopBar title={tunnelName} showBack={true} onBack={() => navigation.goBack()} />

        {/* Tunnel Rules */}
        {tunnelData?.rules ? (
          <View style={{ backgroundColor: '#141414', padding: 16, marginHorizontal: 16, marginTop: 16, borderRadius: 12 }}>
            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>TUNNEL RULES</Text>
            <Text style={{ color: '#6d7382', fontSize: 12, lineHeight: 18 }}>{tunnelData.rules}</Text>
          </View>
        ) : null}

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1f1f1f', marginTop: 16 }}>
          <TouchableOpacity onPress={() => setActiveTab('discuss')} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === 'discuss' ? '#ef4444' : 'transparent' }}>
            <Text style={{ color: activeTab === 'discuss' ? '#fff' : '#6d7382', fontWeight: '700' }}>Discussions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('vote')} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === 'vote' ? '#ef4444' : 'transparent' }}>
            <Text style={{ color: activeTab === 'vote' ? '#fff' : '#6d7382', fontWeight: '700' }}>Votes</Text>
          </TouchableOpacity>
        </View>

        {/* Feed */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>
        ) : (
          <FlatList
            data={posts || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Ionicons name="eye-off-outline" size={48} color="#6d7382" /><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12 }}>No {activeTab === 'discuss' ? 'secrets' : 'votes'} yet</Text></View>}
            renderItem={({ item }) => (
              <View style={{ paddingBottom: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Image source={{ uri: item.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.profiles?.full_name}` }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }} />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{item.profiles?.full_name}</Text>
                  {isAdmin && (
                    <TouchableOpacity onPress={() => deletePost(item.id)} style={{ marginLeft: 'auto' }}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22, marginBottom: item.image_url ? 12 : 0 }}>{item.content}</Text>
                
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 220, borderRadius: 12, marginBottom: 12 }} />
                )}

                {item.post_type === 'poll' && item.poll_options && (
                  <View style={{ backgroundColor: '#141414', borderRadius: 12, padding: 12, marginTop: 8 }}>
                    {(() => {
                      const votes = item.votes_data || {};
                      const totalVotes = Object.keys(votes).length;
                      const userVote = votes[profile?.id];
                      
                      const voteCounts = item.poll_options.map((_: any, i: number) => 
                        Object.values(votes).filter(v => v === i).length
                      );
                      const maxVotes = Math.max(...voteCounts);

                      return (
                        <>
                          {item.poll_options.map((opt: string, idx: number) => {
                            const optionVotes = voteCounts[idx];
                            // Percentage based on total votes cast, not total members
                            const pct = totalVotes === 0 ? 0 : Math.round((optionVotes / totalVotes) * 100);
                            const isWinner = totalVotes > 0 && optionVotes === maxVotes;

                            return (
                              <TouchableOpacity 
                                key={idx} 
                                onPress={() => castVote(item, idx)}
                                style={{ 
                                  paddingVertical: 14, 
                                  paddingHorizontal: 12,
                                  borderBottomWidth: idx < item.poll_options.length - 1 ? 1 : 0, 
                                  borderBottomColor: '#1f1f1f',
                                  backgroundColor: userVote === idx ? 'rgba(239,68,68,0.15)' : 'transparent',
                                  borderRadius: 8,
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 4
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                  <Ionicons name={userVote === idx ? 'radio-button-on' : 'radio-button-off'} size={18} color={userVote === idx ? '#ef4444' : '#6d7382'} />
                                  <Text style={{ color: '#fff', fontWeight: '500' }}>{opt}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Text style={{ color: isWinner ? '#22c55e' : '#6d7382', fontWeight: '700' }}>{pct}%</Text>
                                  {isWinner && <Ionicons name="trophy" size={14} color="#22c55e" />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                          
                          {/* Show turnout based on total members */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f' }}>
                            <Text style={{ color: '#6d7382', fontSize: 11 }}>
                              {totalVotes} out of {tunnelMembers || 0} members voted
                            </Text>
                            {totalVotes > 0 && (
                              <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '600' }}>
                                {Math.round((totalVotes / (tunnelMembers || 1)) * 100)}% turnout
                              </Text>
                            )}
                          </View>
                        </>
                      );
                    })()}
                  </View>
                )}
              </View>
            )}
          />
        )}

        {/* FAB */}
        {(tunnelData?.allow_posts !== false || isAdmin) && (
          <TouchableOpacity onPress={() => setModalOpen(true)} style={{ position: 'absolute', bottom: insets.bottom + 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }}>
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        {/* CREATE MODAL */}
        <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
              <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={{ color: '#6d7382', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Create New</Text>
              <TouchableOpacity onPress={submitPost} disabled={submitting}>
                <Text style={{ color: submitting ? '#6d7382' : '#ef4444', fontSize: 16, fontWeight: '700' }}>{submitting ? 'Posting...' : 'Post'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <TouchableOpacity onPress={() => setPostType('secret')} style={{ flex: 1, backgroundColor: postType === 'secret' ? '#ef4444' : '#141414', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Post a Secret</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPostType('poll')} style={{ flex: 1, backgroundColor: postType === 'poll' ? '#ef4444' : '#141414', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Create Vote</Text>
                </TouchableOpacity>
              </View>

              <TextInput style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, minHeight: 100 }} placeholder="What's the tea?..." placeholderTextColor="#6d7382" value={content} onChangeText={setContent} multiline />

              {postType === 'secret' && (
                <TouchableOpacity onPress={pickImage} style={{ height: 200, borderRadius: 12, backgroundColor: '#141414', marginTop: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#6d7382' }}>Add Image (Required)</Text>}
                </TouchableOpacity>
              )}

              {postType === 'poll' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>POLL OPTIONS</Text>
                  {pollOptions.map((opt, idx) => (
                    <TextInput key={idx} style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, marginBottom: 8 }} placeholder={`Option ${idx + 1}`} placeholderTextColor="#6d7382" value={opt} onChangeText={(v) => { const newOpts = [...pollOptions]; newOpts[idx] = v; setPollOptions(newOpts); }} />
                  ))}
                  <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ''])}>
                    <Text style={{ color: '#ef4444', fontWeight: '600', marginTop: 8 }}>+ Add Option</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}
