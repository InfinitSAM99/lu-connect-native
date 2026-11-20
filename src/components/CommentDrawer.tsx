import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { tapLight, tapHeavy } from '../lib/haptics';
import ReactionPicker from './comments/ReactionPicker';

const EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂', '👍', '🎉', '💯', '🙏'];

export default function CommentDrawer({ post, onClose, onPostUpdate }: { post: any; onClose: () => void; onPostUpdate?: (postId: string, updates: any) => void }) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  
  const [pickerVisible, setPickerVisible] = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [menuComment, setMenuComment] = useState<any>(null);
  
  const [sortMode, setSortMode] = useState<'relevant' | 'newest' | 'all'>('relevant');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // 🔥 MENTIONS STATE
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);

  const load = async () => {
    let query = supabase
      .from('comments')
      .select('id, post_id, author_id, content, created_at, parent_id, reply_to_user_id, is_deleted, author:profiles!comments_author_id_fkey(id, full_name, avatar_url), comment_attachments(id, storage_path)')
      .eq('post_id', post.id);

    if (sortMode === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: true });
    }

    const { data: rows, error } = await query;

    if (error) { console.error(error); setLoading(false); return; }
    
    let sortedRows = rows || [];
    
    if (sortMode === 'relevant') {
      const replyCounts: Record<string, number> = {};
      sortedRows.filter((c: any) => c.parent_id).forEach((c: any) => {
        replyCounts[c.parent_id] = (replyCounts[c.parent_id] || 0) + 1;
      });
      
      const topLevelOnly = sortedRows.filter((c: any) => !c.parent_id);
      const repliesOnly = sortedRows.filter((c: any) => c.parent_id);
      
      topLevelOnly.sort((a: any, b: any) => {
        const aReplies = replyCounts[a.id] || 0;
        const bReplies = replyCounts[b.id] || 0;
        if (bReplies !== aReplies) return bReplies - aReplies;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      sortedRows = [...topLevelOnly, ...repliesOnly];
    }

    setComments(sortedRows);
    
    if (sortedRows.length > 0) {
      const commentIds = sortedRows.map(r => r.id);
      const { data: rx } = await supabase.from('comment_reactions').select('comment_id, user_id, reaction_type').in('comment_id', commentIds);
      const myRxMap: Record<string, string> = {};
      (rx || []).forEach((r: any) => { if (r.user_id === profile?.id) myRxMap[r.comment_id] = r.reaction_type; });
      setMyReactions(myRxMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!post?.id) return;
    load();
    const channelName = `comments-${post.id}-${Date.now()}`;
    const ch = supabase.channel(channelName).on(
      'postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => load()
    );
    const timer = setTimeout(() => { ch.subscribe(); }, 100);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [post.id, sortMode]);

  // 🔥 MENTION SEARCH LOGIC
  const handleTextChange = async (val: string) => {
    setText(val);
    const match = val.match(/@(\w*)$/);
    
    if (match) {
      const query = match[1];
      setMentionSearch(query);
      if (query.length > 0) {
        const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').ilike('full_name', `%${query}%`).limit(5);
        setMentionResults(data || []);
      } else {
        setMentionResults([]);
      }
    } else {
      setMentionSearch(null);
      setMentionResults([]);
    }
  };

  const insertMention = (user: any) => {
    tapLight();
    const match = text.match(/@(\w*)$/);
    if (match) {
      const newText = text.replace(/@\w*$/, `@${user.full_name.replace(/\s/g, '_')} `);
      setText(newText);
      setSelectedMentions(prev => [...new Set([...prev, user.id])]);
    }
    setMentionSearch(null);
    setMentionResults([]);
  };

  const handleReaction = async (commentId: string, type: string) => {
    setPickerVisible(null);
    if (!profile?.id) return;
    tapLight();
    const currentReaction = myReactions[commentId];
    const isRemoving = currentReaction === type;

    setMyReactions(prev => {
      const next = { ...prev };
      if (isRemoving) delete next[commentId];
      else next[commentId] = type;
      return next;
    });

    try {
      await supabase.from('comment_reactions').delete().match({ comment_id: commentId, user_id: profile.id });
      if (!isRemoving) await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: profile.id, reaction_type: type });
    } catch (e) { load(); }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const submit = async () => {
    if ((!text.trim() && !selectedImage) || !profile) return;
    const content = text.trim();
    const parentId = replyingTo?.id || null;
    const replyToUserId = replyingTo?.author_id || null;
    
    setText(''); setReplyingTo(null); setSending(true);
    setShowEmoji(false);
    setSelectedMentions([]); // Clear mentions

    let attachmentPath = null;

    if (selectedImage) {
      setUploading(true);
      try {
        const fileExt = selectedImage.split('.').pop();
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
        const response = await fetch(selectedImage);
        const arrayBuffer = await response.arrayBuffer();
        
        const { data: uploadData, error: uploadError } = await supabase.storage.from('comments').upload(fileName, arrayBuffer, { contentType: `image/${fileExt}` });
        
        if (uploadError) {
          Alert.alert('Upload Failed', uploadError.message);
          setUploading(false); setSending(false); return;
        }

        const { data: urlData } = supabase.storage.from('comments').getPublicUrl(fileName);
        attachmentPath = urlData.publicUrl;
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Something went wrong.');
        setUploading(false); setSending(false); return;
      }
      setUploading(false); setSelectedImage(null);
    }

    const { data: newComment, error: commentError } = await supabase.from('comments').insert({
      post_id: post.id, author_id: profile.id, content: content || null, parent_id: parentId, reply_to_user_id: replyToUserId
    }).select('id').single();

    if (commentError) {
      Alert.alert('Comment Error', commentError.message);
      setText(content); setSending(false); return;
    }

    if (newComment) {
      if (attachmentPath) {
        await supabase.from('comment_attachments').insert({
          comment_id: newComment.id, attachment_type: 'image', storage_path: attachmentPath
        });
      }
      
      // 🔥 INSERT MENTIONS
      if (selectedMentions.length > 0) {
        const mentionsData = selectedMentions.map(uid => ({
          comment_id: newComment.id,
          mentioned_user_id: uid
        }));
        await supabase.from('comment_mentions').insert(mentionsData);
      }
    }

    setSending(false);
    if (onPostUpdate) onPostUpdate(post.id, { comment_count: (post.comment_count || 0) + 1 });
    load();
  };

  const deleteComment = async (commentId: string) => {
    setMenuComment(null);
    const originalComments = [...comments];
    setComments(prev => prev.filter(c => c.id !== commentId));
    if (onPostUpdate) onPostUpdate(post.id, { comment_count: Math.max(0, (post.comment_count || 1) - 1) });

    const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
    
    if (error) {
      setComments(originalComments);
      if (onPostUpdate) onPostUpdate(post.id, { comment_count: post.comment_count });
      Alert.alert('Error', 'Database blocked the delete. Check RLS policies.');
    }
  };

  const activeComments = comments.filter(c => !c.is_deleted);
  const topLevel = activeComments.filter((c) => !c.parent_id);
  const repliesByParent: Record<string, any[]> = {};
  activeComments.filter((c) => c.parent_id).forEach((c) => {
    if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = [];
    repliesByParent[c.parent_id].push(c);
  });

  const renderComment = (c: any, isReply = false) => {
    const canDelete = c.author_id === profile?.id || post.author_id === profile?.id;

    // Parse mentions in text to highlight them
    const renderTextWithMentions = (text: string) => {
      const parts = text.split(/(@\w+)/g);
      return parts.map((part, index) => {
        if (part.startsWith('@')) {
          return <Text key={index} style={{ color: '#3b82f6', fontWeight: '600' }}>{part}</Text>;
        }
        return <Text key={index}>{part}</Text>;
      });
    };

    return (
      <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginBottom: isReply ? 0 : 16 }}>
        <Image source={{ uri: c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.author?.full_name || 'U'}` }} style={{ width: isReply ? 28 : 32, height: isReply ? 28 : 32, borderRadius: isReply ? 14 : 16 }} />
        <View style={{ flex: 1 }}>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            onLongPress={() => { tapHeavy(); setMenuComment({ ...c, canDelete }); }}
            delayLongPress={300}
            style={{ backgroundColor: '#141414', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderTopLeftRadius: 4 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
              {c.author?.full_name || 'Student'}
            </Text>
            
            {c.reply_to_user_id && c.reply_to_user_id !== c.author_id && (
              <Text style={{ fontSize: 14, marginTop: 3, color: '#3b82f6', fontWeight: '600' }}>@{c.author?.full_name}</Text>
            )}
            
            {c.content ? (
              <Text style={{ fontSize: 14, marginTop: 3, color: '#fff', lineHeight: 20 }}>
                {renderTextWithMentions(c.content)}
              </Text>
            ) : null}
            
            {c.comment_attachments?.map((att: any) => (
              <Image key={att.id} source={{ uri: att.storage_path }} style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 8, backgroundColor: '#2a2a2a' }} resizeMode="cover" />
            ))}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6, marginLeft: 4 }}>
            <TouchableOpacity onPress={() => setReplyingTo({ id: c.id, author_id: c.author_id, name: c.author?.full_name || 'Student' })}>
              <Text style={{ fontSize: 12, color: '#6d7382', fontWeight: '600' }}>Reply</Text>
            </TouchableOpacity>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity onPress={() => handleReaction(c.id, 'like')} onLongPress={() => setPickerVisible(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 14 }}>{myReactions[c.id] ? '👍' : '👍🏻'}</Text>
                <Text style={{ fontSize: 11, color: myReactions[c.id] ? '#3b82f6' : '#6d7382', fontWeight: '600' }}>Like</Text>
              </TouchableOpacity>
              {pickerVisible === c.id && <ReactionPicker visible={true} onSelect={(type) => handleReaction(c.id, type)} onClose={() => setPickerVisible(null)} />}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            <View style={{ alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
              <View style={{ width: 40 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Comments</Text>
                <TouchableOpacity onPress={() => setShowSortMenu(!showSortMenu)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6d7382', fontWeight: '600' }}>
                    {sortMode === 'relevant' ? 'Most relevant' : sortMode === 'newest' ? 'Newest' : 'All comments'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#6d7382" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="always">
              {loading ? <ActivityIndicator color="#ef4444" /> : topLevel.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Ionicons name="chatbubble-outline" size={40} color="#1f1f1f" style={{ marginBottom: 10 }} />
                  <Text style={{ color: '#6d7382', textAlign: 'center', fontSize: 15 }}>No comments yet.</Text>
                </View>
              ) : (
                topLevel.map((c) => {
                  const replies = repliesByParent[c.id] || [];
                  return (
                    <View key={c.id} style={{ marginBottom: 16 }}>
                      {renderComment(c, false)}

                      {replies.length > 0 && (
                        <View style={{ marginLeft: 42, marginTop: -16 }}>
                          {replies.length > 2 && (
                            <TouchableOpacity onPress={() => navigation.navigate('ReplyThreadScreen', { rootCommentId: c.id })} style={{ paddingVertical: 8, marginBottom: 8 }}>
                              <Text style={{ color: '#6d7382', fontSize: 13, fontWeight: '700' }}>View all {replies.length} replies</Text>
                            </TouchableOpacity>
                          )}

                          {replies.slice(0, 2).map((r, idx) => (
                            <View key={r.id} style={{ flexDirection: 'row' }}>
                              <View style={{ width: 32, marginLeft: -32 }}>
                                <View style={{ position: 'absolute', left: 15, top: -20, bottom: idx === Math.min(replies.length, 2) - 1 ? '50%' : -20, width: 2, backgroundColor: '#3f3f3f' }} />
                                <View style={{ position: 'absolute', left: 15, top: '50%', width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#3f3f3f', borderBottomLeftRadius: 10 }} />
                              </View>
                              <View style={{ flex: 1, paddingTop: 8 }}>{renderComment(r, true)}</View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* 🔥 MENTION DROPDOWN */}
            {mentionSearch !== null && mentionResults.length > 0 && (
              <View style={{ maxHeight: 150, backgroundColor: '#1f1f1f', borderTopWidth: 1, borderTopColor: '#333' }}>
                <ScrollView keyboardShouldPersistTaps="always">
                  {mentionResults.map(user => (
                    <TouchableOpacity key={user.id} onPress={() => insertMention(user)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}>
                      <Image source={{ uri: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}` }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 10 }} />
                      <Text style={{ color: '#fff', fontSize: 14 }}>{user.full_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {selectedImage && (
              <View style={{ padding: 10, backgroundColor: '#141414', borderTopWidth: 1, borderTopColor: '#1f1f1f' }}>
                <Image source={{ uri: selectedImage }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ position: 'absolute', top: 5, left: 75, backgroundColor: '#000', borderRadius: 10 }}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            {replyingTo && (
              <View style={styles.replyBar}>
                <Text style={{ flex: 1, color: '#fff', fontSize: 13 }}>Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.name}</Text></Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
              </View>
            )}

            {showEmoji && (
              <View style={{ height: 50, backgroundColor: '#141414', borderTopWidth: 1, borderTopColor: '#1f1f1f' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'center' }}>
                  {EMOJIS.map(e => (
                    <TouchableOpacity key={e} onPress={() => setText(prev => prev + e)} style={{ padding: 10 }}>
                      <Text style={{ fontSize: 24 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.composer}>
              <TouchableOpacity onPress={pickImage} style={{ padding: 8 }}>
                <Ionicons name="image" size={24} color={selectedImage ? '#3b82f6' : '#6d7382'} />
              </TouchableOpacity>
              <TextInput 
                style={styles.input} 
                placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : 'Write a comment… (use @ to tag)'} 
                placeholderTextColor="#6d7382" 
                value={text} 
                onChangeText={handleTextChange} 
                multiline 
              />
              <TouchableOpacity onPress={() => setShowEmoji(!showEmoji)} style={{ padding: 8 }}>
                <Ionicons name="happy-outline" size={24} color={showEmoji ? '#3b82f6' : '#6d7382'} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sendBtn, (!text.trim() && !selectedImage) || sending || uploading ? { opacity: 0.5 } : {}]} onPress={submit} disabled={(!text.trim() && !selectedImage) || sending || uploading}>
                {uploading || sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showSortMenu} transparent animationType="fade" onRequestClose={() => setShowSortMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowSortMenu(false)}>
          <View style={{ backgroundColor: '#1f1f1f', borderRadius: 12, width: 250, overflow: 'hidden' }}>
            {['relevant', 'newest', 'all'].map((mode) => (
              <TouchableOpacity 
                key={mode} 
                onPress={() => { setSortMode(mode as any); setShowSortMenu(false); load(); }}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ color: sortMode === mode ? '#3b82f6' : '#fff', fontSize: 16, fontWeight: sortMode === mode ? '700' : '400' }}>
                  {mode === 'relevant' ? 'Most relevant' : mode === 'newest' ? 'Newest' : 'All comments'}
                </Text>
                {sortMode === mode && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!menuComment} transparent animationType="fade" onRequestClose={() => setMenuComment(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMenuComment(null)}>
          <View style={{ backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom || 20 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#3f3f3f', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 20 }} />
            
            {menuComment?.canDelete && (
              <TouchableOpacity onPress={() => deleteComment(menuComment.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
                <Ionicons name="trash" size={22} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600', marginLeft: 14 }}>Delete Comment</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => { Clipboard.setStringAsync(menuComment?.content || ''); setMenuComment(null); Alert.alert('Copied', 'Comment copied to clipboard.'); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
              <Ionicons name="copy" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 14 }}>Copy Text</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setMenuComment(null); Alert.alert('Reported', 'This comment has been reported to the admins.'); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <Ionicons name="flag" size={22} color="#f59e0b" />
              <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: '600', marginLeft: 14 }}>Report Comment</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#000', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%', overflow: 'hidden' },
  handleRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, position: 'relative' },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#6d7382', opacity: 0.5 },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#141414', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 10, backgroundColor: '#0a0a0a', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  input: { flex: 1, backgroundColor: '#141414', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
});
