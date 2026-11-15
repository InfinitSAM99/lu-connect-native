// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Single global realtime subscription mounted once at the app root.
 * Invalidates the shared caches whenever:
 *   - a new message arrives in any of my conversations
 *   - a message is updated/deleted
 *   - a conversation_members row changes (last_read_at bumped)
 *   - a new notification arrives for me
 *
 * All invalidations are debounced (250ms) so bursts of events on
 * a busy campus don't storm the server with count queries.
 * Badges drop almost instantly but the network stays quiet.
 */
export default function useGlobalRealtime(myId) {
  const queryClient = useQueryClient();
  const timersRef = useRef({});

  useEffect(() => {
    if (!myId) return;

    // Debounced invalidation helper — one timer per query-key prefix.
    // Collapses N events in 250ms into a single refetch.
    const scheduleInvalidate = (bucket, keys) => {
      if (timersRef.current[bucket]) clearTimeout(timersRef.current[bucket]);
      timersRef.current[bucket] = setTimeout(() => {
        timersRef.current[bucket] = null;
        keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      }, 250);
    };

    // Channel 1 — messages (new, updated, deleted)
    // Skip my own sends — they don't affect my unread badge or list order.
    const msgCh = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new || payload.old;
          if (row && row.sender_id === myId) {
            // My own message — no badge impact. Just bump the list.
            scheduleInvalidate('convs', [['convs', myId]]);
            return;
          }
          scheduleInvalidate('msgs', [
            ['convs', myId],
            ['unread-messages', myId],
            ['conversation'],
          ]);
        }
      )
      .subscribe();

    // Channel 2 — conversation_members (last_read_at bumps when opening a chat)
    const membersCh = supabase
      .channel('global-conv-members')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members' },
        (payload) => {
          // Only react to my own membership rows
          const row = payload.new || payload.old;
          if (row && row.user_id && row.user_id !== myId) return;
          scheduleInvalidate('members', [
            ['unread-messages', myId],
            ['convs', myId],
          ]);
        }
      )
      .subscribe();

    // Channel 3 — my notifications
    const notifCh = supabase
      .channel('global-notifs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId}` },
        () => {
          scheduleInvalidate('notifs', [
            ['unread-notifs', myId],
            ['notifications', myId],
          ]);
        }
      )
      .subscribe();

    return () => {
      Object.values(timersRef.current).forEach((t) => t && clearTimeout(t));
      timersRef.current = {};
      supabase.removeChannel(msgCh);
      supabase.removeChannel(membersCh);
      supabase.removeChannel(notifCh);
    };
  }, [myId, queryClient]);
}
