// @ts-nocheck
import { supabase } from './supabase';

// Global presence listener — reads the 'presence-global' broadcast channel
// that Layout.jsx emits. Consumers get a live map of { userId: lastSeenTs }.
//
// Usage:
//   const onlineMap = usePresenceMap();       // { [userId]: timestamp }
//   const isOnline = useIsOnline(userId);     // boolean

import { useEffect, useState } from 'react';

let channel = null;
let listeners = new Set();
let onlineMap = {};
const ONLINE_WINDOW_MS = 25 * 1000;

function ensureChannel() {
  if (channel) return channel;
  channel = supabase
    .channel('presence-global')
    .on('broadcast', { event: 'online' }, ({ payload }) => {
      if (!payload?.userId) return;
      onlineMap = { ...onlineMap, [payload.userId]: payload.ts || Date.now() };
      emit();
    })
    .on('broadcast', { event: 'offline' }, ({ payload }) => {
      if (!payload?.userId) return;
      const next = { ...onlineMap };
      delete next[payload.userId];
      onlineMap = next;
      emit();
    })
    .subscribe();
  return channel;
}

function emit() {
  listeners.forEach((fn) => fn(onlineMap));
}

export function usePresenceMap() {
  const [map, setMap] = useState(onlineMap);

  useEffect(() => {
    ensureChannel();
    listeners.add(setMap);
    // Tick every 15s so stale entries fall out of the online window
    const t = setInterval(() => {
      const now = Date.now();
      const filtered = {};
      Object.entries(onlineMap).forEach(([k, ts]) => {
        if (now - ts < ONLINE_WINDOW_MS) filtered[k] = ts;
      });
      if (Object.keys(filtered).length !== Object.keys(onlineMap).length) {
        onlineMap = filtered;
      }
      emit();
    }, 8000);
    return () => {
      listeners.delete(setMap);
      clearInterval(t);
    };
  }, []);

  return map;
}

export function isUserOnline(map, userId) {
  if (!userId) return false;
  const ts = map[userId];
  if (!ts) return false;
  return Date.now() - ts < ONLINE_WINDOW_MS;
}
