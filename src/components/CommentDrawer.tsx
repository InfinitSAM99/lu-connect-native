import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function CommentDrawer({ post, onClose }: { post: any; onClose: () => void }) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [likes, setLikes] = useState(post?.like_count || 0);
  const [liked, setLiked] = useState(!!post?.liked);
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const load = async () => {
    const { data: rows, error } = await supabase
      .from('comments')
      .select('id, post_id, author_id, content, created_at, parent_id, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)')
      .eq('post_id', post.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    if (error) { console.error('comment load error:', error); setLoading(false); return; }
    setComments(rows || []);
    setLoading(false);
  };

  const loadLikes = async () => {
    const { count } = await supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
    setLikes(count || 0);
    if (profile?.id) {
      const { data: mine } = await supabase.from('reactions').select('id').eq('post_id', post.id).eq('user_id', profile.id).maybeSingle();
      setLiked(!!mine);
    }
  };

  useEffect(() => {
    if (!post?.id) return;
    load();
    loadLikes();
    const channelName = `comments-${post.id}-${Date.now()}`;
    const ch = supabase.channel(channelName).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
      () => load()
    );
    const timer = setTimeout(() => { ch.subscribe(); }, 100);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [post.id]);

  const toggleLike = async () => {
    if (!profile?.id) return;
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikes((n) => n + (nowLiked ? 1 : -1));
    if (nowLiked) {
      await supabase.from('reactions').insert({ post_id: post.id, user_id: profile.id, type: 'like' });
    } else {
      await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', profile.id);
    }
  };

  const submit = async () => {
    if (!text.trim() || !profile) return;
    const content = text.trim();
    const parentId = replyingTo?.id || null;
    setText(''); setReplyingTo(null);
    setSending(true);
    const { error } = await supabase.from('comments').insert({
      post_id: post.id, author_id: profile.id, content, parent_id: parentId,
    });
    setSending(false);
    if (error) { Alert.alert('Comment failed', error.message); setText(content); return; }

    let notifyUserId = null;
    let title = '';
    if (parentId) {
      const parent = comments.find((c) => c.id === parentId);
      if (parent && parent.author_id !== profile.id) { notifyUserId = parent.author_id; title = `${profile.full_name} replied to your comment`; }
    } else if (post.author_id && post.author_id !== profile.id) {
      notifyUserId = post.author_id; title = `${profile.full_name} commented on your post`;
    }
    if (notifyUserId) {
      await supabase.from('notifications').insert({
        user_id: notifyUserId, actor_id: profile.id, type: 'comment',
        title, body: content.slice(0, 100),
        link: `/posts/${post.id}`, reference_id: post.id,
      });
    }
    load();
  };

  const deleteComment = (c: any) => {
    Alert.alert('Delete comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', c.id).eq('author_id', profile.id);
          if (error) return Alert.alert('Delete failed', error.message);
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

  const media = post?.post_media?.[0];
  const author = post?.profiles;

  const renderComment = (c: any, isReply = false) => (
    <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginBottom: isReply ? 10 : 14, marginLeft: isReply ? 40 : 0 }}>
      <Image source={{ uri: c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.author?.full_name || 'U'}` }} style={{ width: isReply ? 26 : 32, height: isReply ? 26 : 32, borderRadius: isReply ? 13 : 16 }} />
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#141414', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{c.author?.full_name || 'Student'}</Text>
          <Text style={{ fontSize: 14, marginTop: 3, color: '#fff', lineHeight: 20 }}>{c.content}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          {!isReply && (
            <TouchableOpacity onPress={() => setReplyingTo({ id: c.id, name: c.author?.full_name || 'Student' })}>
              <Text style={{ fontSize: 12, color: '#6d7382' }}>Reply</Text>
            </TouchableOpacity>
          )}
          {c.author_id === profile?.id && (
            <TouchableOpacity onPress={() => deleteComment(c)}>
              <Text style={{ fontSize: 12, color: '#ef4444' }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(keyboardHeight, insets.bottom, 10) }]}>
            
            {/* PREMIUM HANDLE + CLOSE */}
            <View style={styles.handleRow}>
              <View style={styles.handle} />
              <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 12, top: 4 }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* HERO HEADER */}
            <View style={{ alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
              <Ionicons name="chatbubbles" size={44} color="#ef4444" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 6 }}>Comments</Text>
              <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 2 }}>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</Text>
            </View>

            {/* PINNED POST */}
            <View style={styles.postPreview}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
                <Image source={{ uri: author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${author?.full_name || 'U'}` }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: '#fff' }}>{author?.full_name || 'User'}</Text>
                  <Text style={{ fontSize: 11, color: '#6d7382' }}>{new Date(post.created_at).toLocaleString()}</Text>
                </View>
              </View>
              {post.content && <Text style={{ paddingHorizontal: 14, paddingBottom: 10, fontSize: 14, color: '#fff', lineHeight: 20 }}>{post.content}</Text>}
              {media?.media_url && (
                <View style={{ backgroundColor: '#000', maxHeight: 200 }}>
                  <Image source={{ uri: media.media_url }} style={{ width: '100%', height: 180, resizeMode: 'contain' }} />
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 20, paddingHorizontal: 14, paddingVertical: 10 }}>
                <TouchableOpacity onPress={toggleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#ef4444' : '#fff'} />
                  <Text style={{ color: liked ? '#ef4444' : '#fff', fontSize: 13, fontWeight: liked ? '700' : '400' }}>{likes}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13 }}>{comments.length}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13 }}>Share</Text>
                </View>
              </View>
            </View>

            {/* COMMENTS */}
            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="always">
              {loading ? <ActivityIndicator color="#ef4444" /> : topLevel.length === 0 ? (
                <Text style={{ color: '#6d7382', textAlign: 'center', padding: 20 }}>No comments yet. Be the first!</Text>
              ) : (
                topLevel.map((c) => (
                  <View key={c.id}>
                    {renderComment(c, false)}
                    {(repliesByParent[c.id] || []).map((r) => renderComment(r, true))}
                  </View>
                ))
              )}
            </ScrollView>

            {/* REPLY BAR */}
            {replyingTo && (
              <View style={styles.replyBar}>
                <Text style={{ flex: 1, color: '#fff', fontSize: 13 }}>Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.name}</Text></Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* COMPOSER */}
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
  sheet: { backgroundColor: '#000', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '95%', overflow: 'hidden' },
  handleRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, position: 'relative' },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#6d7382', opacity: 0.5 },
  postPreview: { borderBottomWidth: 1, borderBottomColor: '#1f1f1f', flexShrink: 0 },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#141414', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: '#0a0a0a', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  input: { flex: 1, backgroundColor: '#141414', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
});
