import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Alert, ActivityIndicator, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video'; 
import { useAudioPlayer } from 'expo-audio'; // ✅ FIXED: Using expo-audio for music
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TRIM_BAR_WIDTH = SCREEN_W - 40;

export default function UploadReelScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const [video, setVideo] = useState<any>(null);
  const [music, setMusic] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [trimStart, setTrimStart] = useState(0); 
  const [trimEnd, setTrimEnd] = useState(100);   
  
  const [overlayText, setOverlayText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [overlayEmoji, setOverlayEmoji] = useState<string | null>(null);
  
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'trim' | 'details' | 'uploading'>('trim');
  const [isMuted, setIsMuted] = useState(false);

  // Video Player
  const player = useVideoPlayer(video?.uri || '', (p) => {
    p.loop = true; 
    p.timeUpdateEventInterval = 0.05;
    p.muted = isMuted;
  });

  // Audio Player (Music)
  const musicPlayer = useAudioPlayer(music?.uri ? { uri: music.uri } : null);

  useEffect(() => {
    if (!video) pickVideo();
  }, []);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!result.canceled) {
      setVideo(result.assets[0]);
      setDuration(result.assets[0].duration || 0);
    } else navigation.goBack();
  };

  const pickMusic = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (!res.canceled) setMusic(res.assets[0]);
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('timeUpdate', (payload) => setCurrentTime(payload.currentTime));
    const playSub = player.addListener('playingChange', (payload) => setIsPlaying(payload.isPlaying));
    return () => { sub.remove(); playSub.remove(); };
  }, [player]);

  const togglePlay = () => {
    if (isPlaying) { 
      player.pause(); 
      if (musicPlayer) musicPlayer.pause(); 
    } else { 
      player.play(); 
      if (musicPlayer) musicPlayer.play(); 
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    player.muted = !isMuted;
  };

  const handleUpload = async () => {
    if (!video || !profile) return;
    setStep('uploading');
    try {
      const ext = video.uri.split('.').pop() || 'mp4';
      const path = `${profile.id}/reel-${Date.now()}.${ext}`;
      const response = await fetch(video.uri);
      const blob = await response.blob();
      
      const { error: upErr } = await supabase.storage.from('reels').upload(path, blob, { contentType: 'video/mp4' });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(path);

      let musicUrl = null;
      if (music) {
        const mExt = music.uri.split('.').pop() || 'mp3';
        const mPath = `${profile.id}/audio-${Date.now()}.${mExt}`;
        const mResponse = await fetch(music.uri);
        const mBlob = await mResponse.blob();
        const { error: mErr } = await supabase.storage.from('reels').upload(mPath, mBlob, { contentType: 'audio/mpeg' });
        if (!mErr) {
          const { data: { publicUrl: mUrl } } = supabase.storage.from('reels').getPublicUrl(mPath);
          musicUrl = mUrl;
        }
      }

      // Generate Thumbnail
      let thumbnailUrl = null;
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(video.uri, { time: 500 });
        const thumbBlob = await (await fetch(thumbUri)).blob();
        const thumbPath = `${profile.id}/thumb-${Date.now()}.jpg`;
        const { error: thumbErr } = await supabase.storage.from('reels').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });
        if (!thumbErr) {
          const { data: { publicUrl: tUrl } } = supabase.storage.from('reels').getPublicUrl(thumbPath);
          thumbnailUrl = tUrl;
        }
      } catch (thumbError) {
        console.log('Thumbnail generation failed:', thumbError);
      }

      const { error: dbErr } = await supabase.from('reels').insert({
        user_id: profile.id,
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl, // Save the new thumbnail
        caption: caption.trim() || overlayText || 'New Reel',
        university_id: profile.university_id,
        music_url: musicUrl,
        overlay_text: overlayText,
        overlay_emoji: overlayEmoji,
      });
      if (dbErr) throw dbErr;

      Alert.alert('Success', 'Reel uploaded successfully!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
      setStep('details');
    }
  };

  const panStart = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      let newStart = trimStart + (gs.dx / TRIM_BAR_WIDTH) * 100;
      if (newStart < 0) newStart = 0;
      if (newStart > trimEnd - 5) newStart = trimEnd - 5;
      setTrimStart(newStart);
    }
  })).current;

  const panEnd = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      let newEnd = trimEnd + (gs.dx / TRIM_BAR_WIDTH) * 100;
      if (newEnd > 100) newEnd = 100;
      if (newEnd < trimStart + 5) newEnd = trimStart + 5;
      setTrimEnd(newEnd);
    }
  })).current;

  if (step === 'trim' && video) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.toolBtn} onPress={pickMusic}>
              <Ionicons name="musical-notes-outline" size={24} color={music ? '#3b82f6' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setOverlayEmoji(overlayEmoji ? null : '🔥')}>
              <Ionicons name="happy-outline" size={24} color={overlayEmoji ? '#3b82f6' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setShowTextInput(!showTextInput)}>
              <Text style={{ color: overlayText ? '#3b82f6' : '#fff', fontSize: 20, fontWeight: '700' }}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={toggleMute}>
              <Ionicons name={isMuted ? "volume-mute-outline" : "volume-high-outline"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {showTextInput && (
          <View style={{ position: 'absolute', top: insets.top + 60, left: 20, right: 20, zIndex: 100, backgroundColor: '#141414', padding: 16, borderRadius: 12 }}>
            <TextInput
              style={{ color: '#fff', fontSize: 16 }}
              placeholder="Type text to display on video..."
              placeholderTextColor="#6d7382"
              value={overlayText}
              onChangeText={setOverlayText}
              onSubmitEditing={() => setShowTextInput(false)}
              autoFocus
            />
          </View>
        )}

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
          
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {overlayText ? <Text style={styles.overlayTextStyle}>{overlayText}</Text> : null}
            {overlayEmoji ? <Text style={{ fontSize: 80, marginTop: 10 }}>{overlayEmoji}</Text> : null}
          </View>
        </View>

        <View style={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
          
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</Text>
              <Text style={{ color: '#fff', fontSize: 12 }}>{new Date(duration).toISOString().substr(14, 5)}</Text>
            </View>

            <View style={{ height: 50, justifyContent: 'center' }}>
              <View style={{ height: 4, backgroundColor: '#333', width: '100%', position: 'absolute' }} />
              
              <View style={{ 
                position: 'absolute', left: `${trimStart}%`, right: `${100 - trimEnd}%`, height: 40, 
                borderWidth: 3, borderColor: '#fff', borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.3)'
              }}>
                <View {...panStart.panHandlers} style={styles.handleLeft} />
                <View {...panEnd.panHandlers} style={styles.handleRight} />
              </View>

              <View style={{ position: 'absolute', left: `${(currentTime / (duration/1000)) * 100}%`, height: 50, width: 2, backgroundColor: '#fff' }} />
            </View>
            <Text style={{ color: '#6d7382', fontSize: 12, textAlign: 'center', marginTop: 8 }}>Drag the edges to trim</Text>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={togglePlay} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.pillBtn}>
              <Text style={styles.pillBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { player.pause(); if(musicPlayer) musicPlayer.pause(); setStep('details'); }} style={[styles.pillBtn, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.pillBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('trim')} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>New Reel</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>CAPTION</Text>
        <TextInput
          style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, minHeight: 120, textAlignVertical: 'top' }}
          placeholder="Write a caption..."
          placeholderTextColor="#6d7382"
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        <View style={{ flex: 1 }} />

        <TouchableOpacity 
          style={{ backgroundColor: '#ef4444', padding: 18, borderRadius: 14, alignItems: 'center' }} 
          onPress={handleUpload}
        >
          {step === 'uploading' ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>UPLOAD REEL</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  toolBtn: { padding: 4 },
  
  handleLeft: { position: 'absolute', left: -4, top: 0, bottom: 0, width: 12, backgroundColor: '#fff', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  handleRight: { position: 'absolute', right: -4, top: 0, bottom: 0, width: 12, backgroundColor: '#fff', borderTopRightRadius: 8, borderBottomRightRadius: 8 },

  pillBtn: { backgroundColor: '#1f1f1f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  pillBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  overlayTextStyle: { color: '#fff', fontSize: 32, fontWeight: '800', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4, textAlign: 'center' }
});
