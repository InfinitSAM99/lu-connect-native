import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LiveKitRoom, AudioSession, useRoomContext, useLocalParticipant } from '@livekit/react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { tapLight, tapHeavy } from '../lib/haptics';
import LULogo from '../components/LULogo';

export default function AudioCallScreen({ route, navigation }: any) {
  const { otherUser, isIncoming, callId: initialCallId, conversationId } = route.params || {};
  const { profile: me } = useAuth();
  const insets = useSafeAreaInsets();

  const [callStatus, setCallStatus] = useState<'ringing' | 'active' | 'ended'>('ringing');
  const [callId, setCallId] = useState(initialCallId);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true })
    ).start();
  }, []);

  // 1. Create the call in DB if it's an outgoing call
  useEffect(() => {
    if (!isIncoming && !callId && me?.id && otherUser?.id) {
      const createCall = async () => {
        const { data } = await supabase.from('active_calls').insert({
          caller_id: me.id, receiver_id: otherUser.id, status: 'ringing'
        }).select().single();
        if (data) setCallId(data.id);
      };
      createCall();
    }
  }, [isIncoming, callId, me, otherUser]);

  // 2. Listen for the call status to change to 'accepted'
  useEffect(() => {
    if (!callId) return;
    const channel = supabase.channel(`call:${callId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_calls', filter: `id=eq.${callId}` }, (payload) => {
        if (payload.new.status === 'accepted') { 
          setCallStatus('active'); 
          tapLight(); 
        }
        else if (payload.new.status === 'declined' || payload.new.status === 'ended') { 
          handleEndCall(payload.new.status); 
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [callId]);

  // 3. When call is active, fetch the LiveKit Token
  useEffect(() => {
    if (callStatus !== 'active' || !me?.id || !callId) return;

    const fetchToken = async () => {
      try {
        const roomName = `call_${callId}`;
        const { data, error } = await supabase.functions.invoke('livekit-token', {
          body: { roomName, participantName: me.id }
        });
        
        if (error) throw error;
        
        if (data?.token) {
          setLivekitToken(data.token);
          setLivekitUrl(data.url || 'wss://your-livekit-server-url');
        } else {
          Alert.alert('Error', 'Failed to get LiveKit token');
        }
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    };

    fetchToken();
  }, [callStatus, me, callId]);

  // 4. Handle end call
  const handleEndCall = async (finalStatus = 'ended') => {
    tapHeavy();
    setCallStatus('ended');
    if (callId) await supabase.from('active_calls').update({ status: finalStatus }).eq('id', callId);
    if (conversationId) {
      const callMsg = finalStatus === 'declined' ? 'Declined Call' : `Audio Call`;
      await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: isIncoming ? otherUser.id : me.id, content: callMsg, attachment_type: 'call' });
    }
    setTimeout(() => navigation.goBack(), 1000);
  };

  const avatarUrl = otherUser?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser?.full_name || 'User'}`;
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  // If we have a token and the call is active, connect to LiveKit
  if (callStatus === 'active' && livekitToken && livekitUrl) {
    return (
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={false}
      >
        <ActiveCallView 
          otherUser={otherUser} 
          onEndCall={() => handleEndCall('ended')} 
          avatarUrl={avatarUrl}
          pulseScale={pulseScale}
          pulseOpacity={pulseOpacity}
        />
      </LiveKitRoom>
    );
  }

  // Otherwise, show the Ringing / Connecting UI
  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
      <LinearGradient colors={['rgba(239,68,68,0.15)', '#000000', '#000000']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.topBranding}><LULogo size={36} animate={false} /><Text style={styles.brandTitle}>LU CALL</Text></View>
      
      <View style={styles.header}>
        <View style={{ width: 160, height: 160, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        </View>
        <Text style={styles.name}>{otherUser?.full_name || 'Unknown'}</Text>
        <Text style={[styles.statusText, callStatus === 'active' && { color: '#22c55e' }]}>
          {callStatus === 'ringing' && 'Ringing...'}
          {callStatus === 'active' && 'Connecting to LiveKit...'}
          {callStatus === 'ended' && 'Call Ended'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.endCallBtn} onPress={() => handleEndCall('ended')}>
          <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Sub-component that only renders inside LiveKitRoom
function ActiveCallView({ otherUser, onEndCall, avatarUrl, pulseScale, pulseOpacity }: any) {
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      setIsMuted(!isMicrophoneEnabled);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(34,197,94,0.15)', '#000000', '#000000']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.topBranding}><LULogo size={36} animate={false} /><Text style={styles.brandTitle}>LU CALL</Text></View>

      <View style={styles.header}>
        <View style={{ width: 160, height: 160, justifyContent: 'center', alignItems: 'center' }}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        </View>
        <Text style={styles.name}>{otherUser?.full_name || 'Unknown'}</Text>
        <Text style={[styles.statusText, { color: '#22c55e' }]}>
          {formatDuration(callDuration)}
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.optionRow}>
          <TouchableOpacity style={[styles.optionBtn, isMuted && { backgroundColor: '#fff' }]} onPress={toggleMute}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color={isMuted ? '#000' : '#fff'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endCallBtn} onPress={onEndCall}>
          <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'space-between', alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  topBranding: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  brandTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  header: { alignItems: 'center', marginTop: 40 },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#ef4444' },
  avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#ef4444' },
  name: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  statusText: { color: '#a1a1aa', fontSize: 16, fontWeight: '600' },
  controls: { width: '100%', alignItems: 'center', paddingBottom: 40 },
  optionRow: { flexDirection: 'row', gap: 30, marginBottom: 40 },
  optionBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' },
  endCallBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
});
