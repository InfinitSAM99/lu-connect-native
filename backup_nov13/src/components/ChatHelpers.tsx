import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, PanResponder, Animated, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from 'expo-audio';



export function DoodleBackground() {
  return <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' }} pointerEvents="none" />;
}

export function VoiceNotePlayer({ url, isMine }: any) {
  const player = useAudioPlayer(url);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status.isLoaded) {
        setPlaying(status.playing || false);
        setDuration(status.duration || 0);
        setProgress(status.currentTime || 0);
        if (status.didJustFinish) {
          setPlaying(false);
          setProgress(0);
          player.seekTo(0);
        }
      }
    });
    return () => { try { sub.remove(); } catch {} };
  }, [player]);

  const toggle = () => {
    if (!player) return;
    if (playing) player.pause();
    else player.play();
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Dots to simulate the waveform in the screenshot
  const totalBars = 20;
  const filledBars = duration > 0 ? Math.floor((progress / duration) * totalBars) : 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 200 }}>
      <TouchableOpacity onPress={toggle} style={{ padding: 4 }}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#fff" style={{ marginLeft: playing ? 0 : 2 }} />
      </TouchableOpacity>
      
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginRight: 12, height: 20, gap: 3 }}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <View 
            key={i} 
            style={{ 
              width: 3, 
              height: 12, 
              borderRadius: 1.5, 
              backgroundColor: i < filledBars ? '#fff' : 'rgba(255,255,255,0.3)' 
            }} 
          />
        ))}
      </View>

      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
        {fmt(playing || progress > 0 ? progress : duration)}
      </Text>
    </View>
  );
}

export function GroupMembersList({ groupId, myId }: any) {
  const { data: members } = useQuery({
    queryKey: ['group-members', groupId],
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await supabase.from('group_members').select('user_id, role, profiles:user_id(id, full_name, avatar_url)').eq('group_id', groupId);
      return (data || []).map((m: any) => ({ ...m, profile: m.profiles }));
    },
  });
  const list = members || [];
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={{ color: '#6d7382', fontSize: 13, paddingVertical: 12 }}>Members</Text>
      {list.map((m: any, i: number) => (
        <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#1f1f1f' }}>
          <Image source={{ uri: m.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.profile?.full_name}` }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{m.profile?.full_name || 'User'}{m.user_id === myId ? ' (you)' : ''}</Text>
            {m.role !== 'member' && <Text style={{ color: '#6d7382', fontSize: 12, textTransform: 'capitalize', marginTop: 2 }}>{m.role}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}


function renderMessageText(text: string, textColor: string) {
  
  // Regex to find URLs and deep links
  const urlRegex = /(https?:\/\/[^\s]+|luconnectnative:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <Text style={{ color: textColor, fontSize: 14, lineHeight: 20 }}>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <Text key={i} style={{ color: '#3b82f6', textDecorationLine: 'underline' }} onPress={() => Linking.openURL(part)}>
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export function SwipeableMessage({ message: m, profile, deleted, isImage, isAudio, onDelete, onReply, onScrollTo, showSenderName, themeObj }: any) {
  const isMine = m._optimistic === true || (m.sender_id && m.sender_id === profile?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Animated values for Instagram style swipe
  const pan = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => {
      // Allow swipe in both directions, but dampen it
      const moveX = g.dx;
      const dampened = moveX > 0 ? Math.min(moveX, 60) : Math.max(moveX, -60);
      pan.setValue(dampened);
      
      // Fade in the reply icon based on swipe distance
      const opacity = Math.min(Math.abs(moveX) / 50, 1);
      replyIconOpacity.setValue(opacity);
    },
    onPanResponderRelease: (_, g) => {
      // If swiped far enough, trigger reply
      if (Math.abs(g.dx) > 40) {
        onReply?.(m);
      }
      // Snap back to center smoothly
      Animated.parallel([
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    },
  })).current;

  const bubbleColor = deleted ? '#141414' : isImage ? 'transparent' : isMine ? (themeObj?.myBubble || '#ef4444') : (themeObj?.theirBubble || '#262626');
  const textColor = themeObj?.text || '#fff';

  return (
    <View style={{ flexDirection: 'row', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      
      {/* REPLY ICON (Appears on swipe) */}
      <Animated.View style={{ 
        position: 'absolute', 
        [isMine ? 'right' : 'left']: 10, 
        top: '50%', 
        marginTop: -12,
        opacity: replyIconOpacity,
        zIndex: -1
      }}>
        <Ionicons name="arrow-undo" size={24} color="#ef4444" />
      </Animated.View>

      <Animated.View style={{ maxWidth: '75%', transform: [{ translateX: pan }] }} {...panResponder.panHandlers}>
        <TouchableOpacity activeOpacity={0.9} onLongPress={() => !deleted && setMenuOpen(true)} delayLongPress={400}>
          
          {/* REPLY QUOTE (Outside the bubble) */}
          {m.parent && !deleted && (
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 4, 
              paddingLeft: isMine ? 0 : 8, 
              paddingRight: isMine ? 8 : 0,
              justifyContent: isMine ? 'flex-end' : 'flex-start'
            }}>
              <View style={{ width: 3, height: '100%', backgroundColor: '#6d7382', borderRadius: 2, marginRight: 8 }} />
              <View>
                <Text style={{ color: '#aab0bd', fontSize: 12, fontWeight: '700' }}>
                  {m.parent.sender?.full_name || 'User'}
                </Text>
                <Text style={{ color: '#6d7382', fontSize: 13 }} numberOfLines={1}>
                  {m.parent.is_deleted ? 'Deleted message' : m.parent.content || 'Media'}
                </Text>
              </View>
            </View>
          )}

          {/* MAIN BUBBLE */}
          <View style={[styles.instaBubble, { backgroundColor: bubbleColor }, isImage && { padding: 0 }]}>
            {showSenderName && <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>{m.sender?.full_name || 'User'}</Text>}
            {deleted && <Text style={{ color: '#6d7382', fontSize: 13, fontStyle: 'italic' }}>Message deleted</Text>}
            {isImage && m.attachment_url && <Image source={{ uri: m.attachment_url }} style={{ width: 220, height: 220, borderRadius: 18, margin: 2 }} resizeMode="cover" />}
            {isAudio && m.attachment_url && <VoiceNotePlayer url={m.attachment_url} isMine={isMine} />}
            {!deleted && !isImage && !isAudio && renderMessageText(m.content, textColor)}
            
            {!deleted && (
              <Text style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#aab0bd', fontSize: 10, alignSelf: 'flex-end', marginTop: 4 }}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {isMine && !m._optimistic && <Text> {m.read_at ? '✓✓' : '✓'}</Text>}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* LONG PRESS MENU */}
      {menuOpen && (
        <View style={{ 
          position: 'absolute', 
          top: -50, 
          right: isMine ? 0 : undefined, 
          left: isMine ? undefined : 0, 
          backgroundColor: '#262626', 
          borderRadius: 20, 
          flexDirection: 'row', 
          paddingHorizontal: 6, 
          paddingVertical: 6,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 10,
          zIndex: 10
        }}>
          <TouchableOpacity onPress={() => { setMenuOpen(false); onReply?.(m); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Ionicons name="arrow-undo" size={18} color="#fff" />
          </TouchableOpacity>
          {!deleted && m.content && !isImage && !isAudio && (
            <TouchableOpacity onPress={() => { setMenuOpen(false); Clipboard.setStringAsync(m.content); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name="copy-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {isMine && !deleted && (
            <TouchableOpacity onPress={() => { setMenuOpen(false); onDelete?.(m); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  instaBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  voice: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12 },
});
