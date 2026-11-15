import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { tapLight, tapHeavy } from '../lib/haptics';

export default function CommentDrawer({ post, onClose, onPostUpdate }: { post: any; onClose: () => void; onPostUpdate?: (postId: string, updates: any) => void }) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [myPostVote, setMyPostVote] = useState<string | null>(post?.my_vote || null);
  const [postUpvotes, setPostUpvotes] = useState(post?.upvotes || 0);
  const [postDownvotes, setPostDownvotes] = useState(post?.downvotes || 0);

  const load = async () => {
    const { data: rows, error } = await supabase
      .from('comments')
      .select('id, post_id, author_id, content, created_at, parent_id, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)')
      .eq('post_id', post.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
      
    if (error) { 
      console.error('comment load error:', error); 
      setLoading(false); 
      return; 
    }
    setComments(rows || []);
    setLoading(false);
  };

  const loadPostVotes = async () => {
    const { data } = await supabase.from('reactions').select('user_id, reaction_type').eq('post_id', post.id).is('comment_id', null);
    let up = 0, down = 0, myVote = null;
    (data || []).forEach((r: any) => {
      if (r.reaction_type === 'up') up++;
      else if (r.reaction_type === 'down') down++;
      if (r.user_id === profile?.id) myVote = r.reaction_type;
    });
    setPostUpvotes(up);
    setPostDownvotes(down);
    setMyPostVote(myVote);
  };

  useEffect(() => {
    if (!post?.id) return;
    load();
    loadPostVotes();
    const channelName = `comments-${post.id}-${Date.now()}`;
    const ch = supabase.channel(channelName).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
      () => load()
    );
    const timer = setTimeout(() => { ch.subscribe(); }, 100);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [post.id]);

  const handlePostVote = async (type: 'up' | 'down') => {
    if (!profile?.id) return;
    if (type === 'up') tapLight(); else tapHeavy();
    
    const isRemoving = myPostVote === type;
    const previousVote = myPostVote;

    let newUp = postUpvotes;
    let newDown = postDownvotes;
    let newVote = type;

    if (isRemoving) {
      newVote = null;
      if (type === 'up') newUp -= 1;
      else newDown -= 1;
    } else {
      if (type === 'up') {
        newUp += 1;
        if (previousVote === 'down') newDown -= 1;
      } else {
        newDown += 1;
        if (previousVote === 'up') newUp -= 1;
      }
    }

    setMyPostVote(newVote);
    setPostUpvotes(newUp);
    setPostDownvotes(newDown);

    if (onPostUpdate) {
      onPostUpdate(post.id, { upvotes: newUp, downvotes: newDown, my_vote: newVote });
    }

    try {
      if (previousVote) await supabase.from('reactions').delete().match({ post_id: post.id, user_id: profile.id });
      if (!isRemoving) await supabase.from('reactions').insert({ post_id: post.id, user_id: profile.id, reaction_type: type });
    } catch (e) {
      setMyPostVote(previousVote);
      loadPostVotes();
    }
  };

  const submit = async () => {
    if (!text.trim() || !profile) return;
    const content = text.trim();
    const parentId = replyingTo?.id || null;
    setText(''); setReplyingTo(null);
    setSending(true);
    
    const newCommentCount = (post.comment_count || 0) + 1;

    const { error } = await supabase.from('comments').insert({
      post_id: post.id, author_id: profile.id, content, parent_id: parentId,
    });
    
    setSending(false);
    
    if (error) { 
      Alert.alert('Comment failed', error.message); 
      setText(content); 
      return; 
    }
    
    if (onPostUpdate) {
      onPostUpdate(post.id, { comment_count: newCommentCount });
    }
    
    load();
  };

  const deleteComment = (c: any) => {
    Alert.alert('Delete comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('comments').update({ is_deleted: true }).eq('id', c.id).eq('author_id', profile.id);
          
          if (onPostUpdate) {
            onPostUpdate(post.id, { comment_count: Math.max(0, (post.comment_count || 1) - 1) });
          }
          load();
        }
      }
    ]);
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent: Record<string, any[]> = {};
  comments.filter((c) => c.parent_id).forEach((c) => {
    if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = [];
    repliesByParent[c.parent_id].push(c);
  });

  const renderComment = (c: any, isReply = false) => (
    <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginBottom: isReply ? 0 : 16 }}>
      <Image source={{ uri: c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.author?.full_name || 'U'}` }} style={{ width: isReply ? 28 : 32, height: isReply ? 28 : 32, borderRadius: isReply ? 14 : 16 }} />
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#141414', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderTopLeftRadius: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{c.author?.full_name || 'Student'}</Text>
          <Text style={{ fontSize: 14, marginTop: 3, color: '#fff', lineHeight: 20 }}>{c.content}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6, marginLeft: 4 }}>
          {/* 🔥 FIX: Allow replying to replies */}
          <TouchableOpacity onPress={() => setReplyingTo({ id: c.id, name: c.author?.full_name || 'Student' })}>
            <Text style={{ fontSize: 12, color: '#6d7382', fontWeight: '600' }}>Reply</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ThumbsUp size={14} color="#6d7382" />
            <Text style={{ fontSize: 11, color: '#6d7382' }}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ThumbsDown size={14} color="#6d7382" />
            <Text style={{ fontSize: 11, color: '#6d7382' }}>0</Text>
          </TouchableOpacity>

          {c.author_id === profile?.id && (
            <TouchableOpacity onPress={() => deleteComment(c)}>
              <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 10) }]}>

            <View style={styles.handleRow}>
              <View style={styles.handle} />
              <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 12, top: 4 }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Comments</Text>
              <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 2 }}>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</Text>
            </View>

            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="always">
              {loading ? <ActivityIndicator color="#ef4444" /> : topLevel.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Ionicons name="chatbubble-outline" size={40} color="#1f1f1f" style={{ marginBottom: 10 }} />
                  <Text style={{ color: '#6d7382', textAlign: 'center', fontSize: 15 }}>No comments yet. Be the first!</Text>
                </View>
              ) : (
                topLevel.map((c) => {
                  const replies = repliesByParent[c.id] || [];
                  return (
                    <View key={c.id} style={{ marginBottom: 16 }}>
                      {renderComment(c, false)}
                      
                      {/* 🔥 THE FACEBOOK-STYLE THREAD LINES (Pure Flexbox, No SVG) */}
                      {replies.length > 0 && (
                        <View style={{ flexDirection: 'row', marginTop: 0 }}>
                          {/* The left border column */}
                          <View style={{ width: 42, alignItems: 'center', marginLeft: -5 }}>
                            <View style={{ 
                              width: 24, 
                              flex: 1, 
                              borderLeftWidth: 2, 
                              borderBottomWidth: 2, 
                              borderColor: '#3f3f3f', 
                              borderBottomLeftRadius: 8,
                              marginTop: 4, // Push down slightly to align with reply avatar center
                              marginBottom: 14 // Stop at the center of the last reply
                            }} />
                          </View>
                          
                          {/* The replies container */}
                          <View style={{ flex: 1, paddingTop: 8 }}>
                            {replies.map((r, idx) => (
                              <View key={r.id} style={{ marginBottom: idx === replies.length - 1 ? 0 : 16 }}>
                                {renderComment(r, true)}
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {replyingTo && (
              <View style={styles.replyBar}>
                <Text style={{ flex: 1, color: '#fff', fontSize: 13 }}>Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.name}</Text></Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : 'Write a comment…'}
                placeholderTextColor="#6d7382"
                value={text}
                onChangeText={setText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
                onPress={submit}
                disabled={!text.trim() || sending}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#000', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', overflow: 'hidden' },
  handleRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, position: 'relative' },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#6d7382', opacity: 0.5 },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#141414', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: '#0a0a0a', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  input: { flex: 1, backgroundColor: '#141414', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
});
