import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { tapLight } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'ReplyThreadScreen'>;

export default function ReplyThreadScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { rootCommentId } = route.params;
  const { profile } = useAuth();
  
  const [thread, setThread] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchThread = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_comment_thread', { root_comment_id: rootCommentId });
    
    if (!error && data) {
      if (data.length > 0 && !postId) setPostId(data[0].post_id);
      
      const authorIds = [...new Set(data.map((c: any) => c.author_id))];
      const commentIds = data.map((c: any) => c.id);
      
      const [profilesRes, reactionsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', authorIds),
        supabase.from('comment_reactions').select('comment_id, reaction_type').in('comment_id', commentIds)
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
      const reactionMap: Record<string, number> = {};
      (reactionsRes.data || []).forEach((r: any) => { reactionMap[r.comment_id] = (reactionMap[r.comment_id] || 0) + 1; });

      setThread(data.map((c: any) => ({ 
        ...c, 
        author: profileMap[c.author_id],
        likeCount: reactionMap[c.id] || 0
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchThread();
    const ch = supabase.channel(`thread-${rootCommentId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchThread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rootCommentId]);

  const handleReply = async () => {
    if (!replyText.trim() || !profile || !postId) return;
    const content = replyText.trim();
    const targetParentId = replyingTo ? replyingTo.id : rootCommentId;
    const targetUserId = replyingTo ? replyingTo.author_id : thread[0]?.author_id;
    
    setReplyText(''); setReplyingTo(null);
    
    const tempId = Math.random().toString();
    const tempComment = {
      id: tempId, post_id: postId, author_id: profile.id, content,
      created_at: new Date().toISOString(), parent_id: targetParentId,
      reply_to_user_id: targetUserId, depth: replyingTo ? replyingTo.depth + 1 : 1,
      author: profile, likeCount: 0
    };
    setThread(prev => [...prev, tempComment]);

    const { error } = await supabase.from('comments').insert({
      post_id: postId, author_id: profile.id, content,
      parent_id: targetParentId, reply_to_user_id: targetUserId
    });

    if (error) {
      setThread(prev => prev.filter(c => c.id !== tempId));
      setReplyText(content);
      Alert.alert('Failed', error.message);
    } else { fetchThread(); }
  };

  const handleLike = async (commentId: string) => {
    if (!profile) return;
    tapLight();
    setThread(prev => prev.map(c => c.id === commentId ? { ...c, likeCount: c.likeCount + 1 } : c));
    await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: profile.id, reaction_type: 'like' });
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const indent = item.depth * 36; 
    const isParent = item.depth === 0;
    const replyUser = thread.find(c => c.author_id === item.reply_to_user_id);
    
    // Check if this is the last reply for a specific parent to stop the line
    const isLastReply = index === thread.length - 1 || thread[index + 1].depth < item.depth;

    return (
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        
        {/* Facebook-style Connector Lines */}
        {!isParent && (
          <View style={{ width: 36, marginLeft: indent - 36 }}>
            {/* Vertical Line */}
            <View style={{ position: 'absolute', left: 17, top: -16, bottom: isLastReply ? '50%' : -16, width: 2, backgroundColor: '#3f3f3f' }} />
            {/* Horizontal Curve */}
            <View style={{ position: 'absolute', left: 17, top: '50%', width: 18, height: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#3f3f3f', borderBottomLeftRadius: 12 }} />
          </View>
        )}

        {/* Comment Content */}
        <View style={{ flex: 1, flexDirection: 'row', marginTop: isParent ? 0 : 8, marginLeft: isParent ? 0 : 8 }}>
          <Image 
            source={{ uri: item.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.author?.full_name}` }} 
            style={{ width: isParent ? 36 : 28, height: isParent ? 36 : 28, borderRadius: isParent ? 18 : 14, marginTop: 2 }} 
          />
          
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={styles.bubble}>
              <Text style={styles.name}>{item.author?.full_name}</Text>
              {item.reply_to_user_id && item.reply_to_user_id !== item.author_id && replyUser && (
                <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '600', marginBottom: 2 }}>@{replyUser.author?.full_name}</Text>
              )}
              <Text style={styles.content}>{item.content}</Text>
            </View>
            
            <View style={styles.actions}>
              <Text style={styles.time}>Just now</Text>
              <TouchableOpacity onPress={() => handleLike(item.id)}>
                <Text style={[styles.actionText, item.likeCount > 0 && { color: '#3b82f6' }]}>
                  {item.likeCount > 0 ? `👍 ${item.likeCount}` : 'Like'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setReplyingTo(item); inputRef.current?.focus(); }}>
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Replies</Text>
        <TouchableOpacity style={{ padding: 8 }}><Ionicons name="search" size={24} color="#fff" /></TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#ef4444" size="large" /></View>
      ) : (
        <FlatList data={thread} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} />
      )}

      {replyingTo && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#141414', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.author?.full_name}</Text></Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={{ color: '#ef4444', fontSize: 12 }}>Cancel</Text></TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom}>
        <View style={[styles.composer, { paddingBottom: insets.bottom || 10 }]}>
          <TextInput ref={inputRef} style={styles.input} placeholder={replyingTo ? `Reply to ${replyingTo.author?.full_name}...` : "Write a reply..."} placeholderTextColor="#6d7382" value={replyText} onChangeText={setReplyText} multiline />
          <TouchableOpacity style={[styles.sendBtn, !replyText.trim() && { opacity: 0.5 }]} onPress={handleReply} disabled={!replyText.trim()}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bubble: { backgroundColor: '#141414', padding: 12, borderRadius: 16, borderTopLeftRadius: 4 },
  name: { color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  content: { color: '#e5e5e5', fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 6, marginLeft: 4 },
  time: { color: '#6d7382', fontSize: 12 },
  actionText: { color: '#6d7382', fontSize: 12, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f', backgroundColor: '#0a0a0a' },
  input: { flex: 1, backgroundColor: '#141414', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
