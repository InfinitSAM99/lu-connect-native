import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, TextInput, KeyboardAvoidingView, Platform, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { recordStoryView, reactToStory } from '../lib/stories';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function StoryViewerScreen({ route, navigation }: any) {
  const { stories: initialStories, allGroups, currentUserIndex = 0 } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [currentGroupIndex, setCurrentGroupIndex] = useState(currentUserIndex);
  const [stories, setStories] = useState(initialStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);

  const currentStory = stories[currentIndex];
  const author = currentStory?.profiles;
  const isMyStory = currentStory?.user_id === profile?.id;

  useEffect(() => {
    if (currentStory && profile?.id && !isMyStory) {
      recordStoryView(currentStory.id, profile.id);
    }
  }, [currentIndex, currentStory, profile?.id, isMyStory]);

  useEffect(() => {
    if (isMyStory && currentStory?.id && viewersOpen) {
      fetchViewers(currentStory.id);
    }
  }, [isMyStory, currentStory?.id, viewersOpen]);

  const fetchViewers = async (storyId: string) => {
    const { data } = await supabase
      .from('story_views')
      .select('viewer_id, viewed_at, profiles:viewer_id(full_name, avatar_url), story_reactions(reaction_type)')
      .eq('story_id', storyId);
    
    const mapped = (data || []).map((v: any) => ({
      id: v.viewer_id,
      name: v.profiles?.full_name || 'User',
      avatar: v.profiles?.avatar_url,
      time: v.viewed_at,
      reactions: v.story_reactions?.map((r: any) => r.reaction_type) || []
    }));
    setViewers(mapped);
  };

  useEffect(() => {
    let interval: any;
    if (!isPaused && !viewersOpen) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            clearInterval(interval);
            setTimeout(() => handleNext(), 50);
            return 0;
          }
          return prev + 0.02;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [currentIndex, isPaused, currentGroupIndex, viewersOpen]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else if (allGroups && currentGroupIndex < allGroups.length - 1) {
      const nextGroup = allGroups[currentGroupIndex + 1];
      setCurrentGroupIndex(prev => prev + 1);
      setStories(nextGroup);
      setCurrentIndex(0);
      setProgress(0);
    } else {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('MainTabs');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleReact = async (type: string) => {
    if (profile?.id && !isMyStory) {
      await reactToStory(currentStory.id, profile.id, type);
    }
  };

  if (!currentStory) return null;

  return (
    <View style={styles.container}>
      {currentStory.story_type === 'image' && currentStory.media_url ? (
        <Image source={{ uri: currentStory.media_url }} style={styles.media} resizeMode="cover" />
      ) : (
        <View style={[styles.media, { backgroundColor: currentStory.background_color || '#111', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', textAlign: 'center', padding: 20 }}>{currentStory.text_content}</Text>
        </View>
      )}

      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <View style={styles.progressRow}>
          {stories.map((_: any, i: number) => (
            <View key={i} style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: i === currentIndex ? `${progress * 100}%` : i < currentIndex ? '100%' : '0%' }]} />
            </View>
          ))}
        </View>
        
        <View style={styles.headerRow}>
          <Image source={{ uri: author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${author?.full_name}` }} style={styles.avatar} />
          <Text style={styles.authorName}>{author?.full_name}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} style={{ padding: 8 }}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.leftTap} onPress={handlePrev} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} />
      <TouchableOpacity style={styles.rightTap} onPress={handleNext} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 10 }]}>
        {isMyStory ? (
          <View style={styles.myStoryBar}>
            <TouchableOpacity style={styles.viewerCount} onPress={() => setViewersOpen(true)}>
              <Ionicons name="chevron-up" size={20} color="#fff" />
              <Text style={styles.viewerText}>{viewers.length > 0 ? `${viewers.length} viewers` : 'No viewers yet'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.addStoryBtn} onPress={() => navigation.navigate('StoryComposer')}>
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.addStoryText}>Add story</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.reactionRow}>
              {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji, i) => (
                <TouchableOpacity key={i} onPress={() => handleReact(['love','haha','wow','sad','angry','like'][i])}>
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.replyBar}>
              <TextInput 
                style={styles.replyInput} 
                placeholder="Send message..." 
                placeholderTextColor="rgba(255,255,255,0.7)" 
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <Modal visible={viewersOpen} transparent animationType="slide" onRequestClose={() => setViewersOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '60%', padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="eye" size={24} color="#000" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#000' }}>{viewers.length} viewers</Text>
              </View>
              <TouchableOpacity onPress={() => setViewersOpen(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {viewers.map((v: any) => (
                <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Image source={{ uri: v.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${v.name}` }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#000' }}>{v.name}</Text>
                  {v.reactions.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {v.reactions.map((r: string, i: number) => (
                        <Text key={i} style={{ fontSize: 18 }}>{r === 'love' ? '❤️' : r === 'haha' ? '😂' : r === 'wow' ? '😮' : r === 'sad' ? '😢' : r === 'angry' ? '😡' : '👍'}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  media: { position: 'absolute', width: SCREEN_W, height: SCREEN_H },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#fff' },
  authorName: { color: '#fff', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  leftTap: { position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '30%' },
  rightTap: { position: 'absolute', right: 0, top: '20%', bottom: '20%', width: '70%' },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  reactionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  replyBar: { flexDirection: 'row', alignItems: 'center' },
  replyInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 15 },
  myStoryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10 },
  viewerCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  addStoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addStoryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
