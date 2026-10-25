import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

const TYPING_TTL_MS = 3000;
const RECORDING_TTL_MS = 6000;
const BROADCAST_INTERVAL_MS = 1500;

export function useChatBroadcaster(conversationId: string, userId: string) {
  const channelRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    if (!conversationId || !userId) return;
    const ch = supabase.channel(`typing-${conversationId}`, { config: { broadcast: { self: false } } });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      try { ch.send({ type: 'broadcast', event: 'stop', payload: { userId } }); } catch {}
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [conversationId, userId]);

  const sendTyping = () => {
    const ch = channelRef.current;
    if (!ch) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < BROADCAST_INTERVAL_MS) return;
    lastTypingSentRef.current = now;
    try { ch.send({ type: 'broadcast', event: 'typing', payload: { userId } }); } catch {}
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
      try { ch.send({ type: 'broadcast', event: 'stop', payload: { userId } }); } catch {}
    }, TYPING_TTL_MS);
  };

  const sendRecording = (isRecording: boolean) => {
    const ch = channelRef.current;
    if (!ch) return;
    try { ch.send({ type: 'broadcast', event: isRecording ? 'recording' : 'stop', payload: { userId } }); } catch {}
  };

  const sendStop = () => {
    const ch = channelRef.current;
    if (!ch) return;
    if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
    try { ch.send({ type: 'broadcast', event: 'stop', payload: { userId } }); } catch {}
  };

  return { sendTyping, sendRecording, sendStop };
}

export function useChatPresence(conversationId: string, myId: string) {
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [recording, setRecording] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!conversationId || !myId) return;
    let active = true;
    const ch = supabase.channel(`typing-${conversationId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        const uid = payload?.userId;
        if (!uid || uid === myId) return;
        setTyping(prev => ({ ...prev, [uid]: Date.now() }));
      })
      .on('broadcast', { event: 'recording' }, ({ payload }: any) => {
        const uid = payload?.userId;
        if (!uid || uid === myId) return;
        setRecording(prev => ({ ...prev, [uid]: Date.now() }));
      })
      .on('broadcast', { event: 'stop' }, ({ payload }: any) => {
        const uid = payload?.userId;
        if (!uid || uid === myId) return;
        setTyping(prev => { const n = { ...prev }; delete n[uid]; return n; });
        setRecording(prev => { const n = { ...prev }; delete n[uid]; return n; });
      })
      .subscribe();

    const tick = setInterval(() => {
      if (!active) return;
      const now = Date.now();
      setTyping(prev => { const n: any = {}; Object.entries(prev).forEach(([k, ts]) => { if (now - ts < TYPING_TTL_MS) n[k] = ts; }); return n; });
      setRecording(prev => { const n: any = {}; Object.entries(prev).forEach(([k, ts]) => { if (now - ts < RECORDING_TTL_MS) n[k] = ts; }); return n; });
    }, 1000);

    return () => { active = false; clearInterval(tick); supabase.removeChannel(ch); };
  }, [conversationId, myId]);

  return { typingUsers: Object.keys(typing), recordingUsers: Object.keys(recording) };
}
