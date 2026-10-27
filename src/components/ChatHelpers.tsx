import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from 'expo-audio';

export const STICKERS = ['😀','😂','🥰','😍','😎','🤩','😭','😅','😊','🙃','😇','🤔','😴','🤗','😘','🥳','👍','👎','👏','🙌','🤝','💪','🙏','✌️','❤️','💔','💯','🔥','⭐','✨','🎉','🎊','🍕','🍔','☕','🍺','⚽','🏀','🎮','🎵','🐶','🐱','🌹','🌈','☀️','🌙','⚡','💧'];

export const isEmojiOnly = (str: string) => {
  if (!str) return false;
  const cleaned = str.replace(/[\s\u200d]/g, '');
  return cleaned.length > 0 && cleaned.length <= 4 && /^\p{Extended_Pictographic}+$/u.test(cleaned);
};

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

  const pct = duration > 0 ? Math.min(progress / duration, 1) : 0;
  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.voice, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)', minWidth: 180 }]}>
      <TouchableOpacity onPress={toggle} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={playing ? 'pause' : 'play'} size={14} color="#fff" />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
          <View style={{ height: 3, width: `${pct * 100}%`, backgroundColor: '#fff' }} />
        </View>
        <Text style={{ color: '#fff', fontSize: 11, marginTop: 5 }}>{fmt(progress)} / {fmt(duration)}</Text>
      </View>
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

export function SwipeableMessage({ message: m, profile, deleted, isImage, isAudio, isSticker, onDelete, onReply, onScrollTo, showSenderName, themeObj }: any) {
  // ✅ Bulletproof rule: 
  // - Optimistic messages are ALWAYS ours
  // - Otherwise, compare sender_id with current profile
  const isMine = m._optimistic === true || (m.sender_id && m.sender_id === profile?.id);

  const [menuOpen, setMenuOpen] = useState(false);
  const pan = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => { if (g.dx > 0 && g.dx < 100) pan.setValue(g.dx); },
    onPanResponderRelease: (_, g) => {
      if (g.dx > 50) onReply?.(m);
      Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const bubbleColor = deleted ? '#141414' : isImage ? 'transparent' : isMine ? (themeObj?.myBubble || '#ef4444') : (themeObj?.theirBubble || '#141414');
  const textColor = themeObj?.text || '#fff';

  return (
    <View style={{ flexDirection: 'row', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
      <Animated.View style={{ maxWidth: '75%', transform: [{ translateX: pan }] }} {...panResponder.panHandlers}>
        <TouchableOpacity activeOpacity={0.9} onLongPress={() => !deleted && setMenuOpen(true)} delayLongPress={400}>
          <View style={[styles.bubble, { backgroundColor: bubbleColor }, isImage && { padding: 0 }]}>
            {showSenderName && <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>{m.sender?.full_name || 'User'}</Text>}
            {m.parent && !deleted && (
              <View style={{ borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.6)', paddingLeft: 6, marginBottom: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{m.parent.sender?.full_name || 'User'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }} numberOfLines={1}>{m.parent.is_deleted ? 'Deleted' : m.parent.content || '(media)'}</Text>
              </View>
            )}
            {deleted && <Text style={{ color: '#6d7382', fontSize: 13, fontStyle: 'italic' }}>Message deleted</Text>}
            {isImage && m.attachment_url && <Image source={{ uri: m.attachment_url }} style={{ width: 220, height: 220, borderRadius: 12, margin: 4 }} resizeMode="cover" />}
            {isAudio && m.attachment_url && <VoiceNotePlayer url={m.attachment_url} isMine={isMine} />}
            {!deleted && !isImage && !isAudio && <Text style={{ color: textColor, fontSize: isSticker ? 32 : 14, lineHeight: isSticker ? 40 : 20 }}>{m.content}</Text>}
            {!deleted && !isSticker && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, alignSelf: 'flex-end', marginTop: 2 }}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {isMine && !m._optimistic && <Text> {m.read_at ? '✓✓' : '✓'}</Text>}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {menuOpen && (
        <View style={{ position: 'absolute', top: -44, right: isMine ? 0 : undefined, left: isMine ? undefined : 0, backgroundColor: '#0a0a0a', borderRadius: 22, flexDirection: 'row', padding: 4, borderWidth: 1, borderColor: '#1f1f1f', zIndex: 10 }}>
          <TouchableOpacity onPress={() => { setMenuOpen(false); onReply?.(m); }} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
            <Ionicons name="return-down-back" size={16} color="#fff" />
          </TouchableOpacity>
          {!deleted && m.content && !isSticker && !isImage && !isAudio && (
            <TouchableOpacity onPress={() => { setMenuOpen(false); Clipboard.setStringAsync(m.content); }} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Ionicons name="copy-outline" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          {isMine && !deleted && (
            <TouchableOpacity onPress={() => { setMenuOpen(false); onDelete?.(m); }} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setMenuOpen(false)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
            <Ionicons name="close" size={16} color="#6d7382" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  voice: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12 },
});
