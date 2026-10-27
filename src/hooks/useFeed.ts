import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { enrichPosts } from '../lib/postEnrichment';
import {
  subscribePosts,
  subscribeReactions,
  subscribeComments,
} from '../lib/feedRealtime';

const POOL_SIZE = 120;
const MAX_POSTS = 400;
const FEED_DAYS = 30;
const SESSION_KEY_KEY = 'lu_feed_session_seed';

// --- Deterministic per-user hash ---
function hash32(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number, salt: number) {
  const x = Math.sin(seed + salt * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// --- Fetch pool ---
async function fetchFeedData(myId: string, universityId?: string | null) {
  const since = new Date(
    Date.now() - FEED_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // Base posts query
  let postsQuery = supabase
    .from('posts')
    .select('*, post_media(*)')
    .eq('is_deleted', false)
    .is('shared_post_id', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(POOL_SIZE);

  // If a university filter is provided, only fetch posts from that university.
  // Anonymous posts still count (they have university_id set).
  if (universityId) {
    postsQuery = postsQuery.eq('university_id', universityId);
  }

  const [postsRes, friendsRes, boostsRes] = await Promise.all([
    postsQuery,
    supabase
      .from('connections')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${myId},receiver_id.eq.${myId}`),
    supabase.from('boosts').select('post_id, expires_at').eq('status', 'active'),
  ]);

  const friendIds = new Set<string>(
    (friendsRes.data || [])
      .map((c: any) =>
        c.requester_id === myId ? c.receiver_id : c.requester_id
      )
      .filter(Boolean)
  );

  const now = Date.now();
  const boostedIds = new Set<string>(
    (boostsRes.data || [])
      .filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now)
      .map((b: any) => b.post_id)
  );

  const enriched = await enrichPosts(postsRes.data || [], myId);
  return { posts: enriched, friendIds, boostedIds };
}

// --- Rank ---
function rankFeed(
  data: { posts: any[]; friendIds: Set<string>; boostedIds: Set<string> },
  myId: string,
  sessionSeed: string
) {
  const now = Date.now();
  const { posts, friendIds, boostedIds } = data;

  const scored = posts.map((p) => {
    let score = 0;
    if (boostedIds.has(p.id)) score += 1000;
    if (friendIds.has(p.author_id)) score += 60;
    if (p.author_id === myId) score += 40;

    const ageHrs = (now - new Date(p.created_at).getTime()) / 3_600_000;
    if (ageHrs < 6) score += 30;
    else if (ageHrs < 24) score += 15;
    else if (ageHrs < 72) score += 5;

    score += Math.min(60, (p.like_count || 0) * 3);
    score += Math.min(60, (p.comment_count || 0) * 6);

    const userSalt = hash32(myId + sessionSeed + p.id);
    score += seededRand(userSalt, p.id.length + 1) * 50;

    return { post: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.post);
}

async function getSessionSeed(): Promise<string> {
  try {
    let seed = await AsyncStorage.getItem(SESSION_KEY_KEY);
    if (!seed) {
      seed = String(Math.floor(Math.random() * 1e9));
      await AsyncStorage.setItem(SESSION_KEY_KEY, seed);
    }
    return seed;
  } catch {
    return String(Date.now());
  }
}

async function resetSessionSeed() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY_KEY);
  } catch {}
}

// --- Hook ---
export function useFeed(myId: string | null) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const initializedRef = useRef(false);

  const loadInitial = useCallback(
    async (isRefresh: boolean) => {
      if (!myId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        if (isRefresh) await resetSessionSeed();
        const seed = await getSessionSeed();
        const data = await fetchFeedData(myId);
        const ranked = rankFeed(data, myId, seed);
        setPosts(ranked);
      } catch (e: any) {
        setError(e?.message || 'Failed to load feed');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [myId]
  );

  // Initial load
  useEffect(() => {
    if (!myId) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadInitial(false);
  }, [myId, loadInitial]);

  // Realtime subscriptions
  useEffect(() => {
    if (!myId) return;

    const unsubPosts = subscribePosts(async (payload: any) => {
      if (payload.eventType !== 'INSERT') return;
      const newRow = payload.new;
      if (!newRow || newRow.is_deleted || newRow.shared_post_id) return;

      const { data } = await supabase
        .from('posts')
        .select('*, post_media(*)')
        .eq('id', newRow.id)
        .maybeSingle();

      if (!data) return;
      const [enriched] = await enrichPosts([data], myId);
      if (!enriched) return;

      setPosts((old) => {
        if (old.find((p) => p.id === enriched.id)) return old;
        return [enriched, ...old].slice(0, MAX_POSTS);
      });
    });

    const unsubReactions = subscribeReactions((payload: any) => {
      const postId = payload.new?.post_id || payload.old?.post_id;
      if (!postId) return;
      setPosts((old) => {
        let changed = false;
        const next = old.map((p) => {
          if (p.id !== postId) return p;
          changed = true;
          const isMine =
            myId &&
            (payload.new?.user_id === myId || payload.old?.user_id === myId);
          if (isMine) return { ...p, liked: payload.eventType === 'INSERT' };
          let delta = 0;
          if (payload.eventType === 'INSERT') delta = 1;
          else if (payload.eventType === 'DELETE') delta = -1;
          return { ...p, like_count: Math.max(0, (p.like_count || 0) + delta) };
        });
        return changed ? next : old;
      });
    });

    const unsubComments = subscribeComments((payload: any) => {
      const postId = payload.new?.post_id || payload.old?.post_id;
      if (!postId) return;
      setPosts((old) => {
        let changed = false;
        const next = old.map((p) => {
          if (p.id !== postId) return p;
          changed = true;
          let delta = 0;
          if (payload.eventType === 'INSERT') delta = 1;
          else if (payload.eventType === 'DELETE') delta = -1;
          return {
            ...p,
            comment_count: Math.max(0, (p.comment_count || 0) + delta),
          };
        });
        return changed ? next : old;
      });
    });

    return () => {
      unsubPosts();
      unsubReactions();
      unsubComments();
    };
  }, [myId]);

  const refresh = useCallback(() => loadInitial(true), [loadInitial]);

  const updatePost = useCallback((postId: string, updates: any) => {
    setPosts((old) =>
      old.map((p) => (p.id === postId ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPosts((old) => old.filter((p) => p.id !== postId));
  }, []);

  return { posts, loading, error, refreshing, refresh, updatePost, deletePost };
}
