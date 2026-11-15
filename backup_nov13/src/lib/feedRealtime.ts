import { supabase } from './supabase';

type Listener = (payload: any) => void;

let channel: any = null;
let refCount = 0;
const listeners = {
  posts: new Set<Listener>(),
  reactions: new Set<Listener>(),
  comments: new Set<Listener>(),
};

function ensureChannel() {
  if (channel) return channel;

  channel = supabase
    .channel('app-global-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (payload: any) => listeners.posts.forEach((fn) => fn(payload))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reactions' },
      (payload: any) => listeners.reactions.forEach((fn) => fn(payload))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      (payload: any) => listeners.comments.forEach((fn) => fn(payload))
    )
    .subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[realtime] channel error:', status);
      }
    });

  return channel;
}

export function subscribePosts(fn: Listener) {
  ensureChannel();
  listeners.posts.add(fn);
  refCount++;
  return () => {
    listeners.posts.delete(fn);
    refCount--;
  };
}

export function subscribeReactions(fn: Listener) {
  ensureChannel();
  listeners.reactions.add(fn);
  refCount++;
  return () => {
    listeners.reactions.delete(fn);
    refCount--;
  };
}

export function subscribeComments(fn: Listener) {
  ensureChannel();
  listeners.comments.add(fn);
  refCount++;
  return () => {
    listeners.comments.delete(fn);
    refCount--;
  };
}
