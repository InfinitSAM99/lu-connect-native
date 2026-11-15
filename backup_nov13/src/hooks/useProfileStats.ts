// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Loads daily snapshots for a profile over the last N days.
 * Returns raw rows, sorted oldest → newest.
 */
async function loadSnapshots(profileId, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('profile_stats_daily')
    .select('*')
    .eq('profile_id', profileId)
    .gte('day', sinceStr)
    .order('day', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Loads current totals (real-time, not from snapshots) for the overview card.
 */
async function loadTotals(profileId) {
  const [followersRes, postsRes] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from('posts')
      .select('id')
      .eq('author_id', profileId)
      .eq('is_deleted', false),
  ]);

  const myPostIds = (postsRes.data || []).map((p) => p.id);

  let totalLikes = 0;
  let totalComments = 0;

  if (myPostIds.length > 0) {
    const [likesRes, commentsRes] = await Promise.all([
      supabase
        .from('reactions')
        .select('*', { count: 'exact', head: true })
        .in('post_id', myPostIds),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id', myPostIds)
        .eq('is_deleted', false),
    ]);
    totalLikes = likesRes.count || 0;
    totalComments = commentsRes.count || 0;
  }

  return {
    followers: followersRes.count || 0,
    posts: myPostIds.length,
    likes: totalLikes,
    comments: totalComments,
  };
}

/**
 * Loads the top-performing posts for a profile.
 */
async function loadTopPosts(profileId) {
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, created_at, post_media(media_url)')
    .eq('author_id', profileId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(30);

  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  const [likesRes, commentsRes] = await Promise.all([
    supabase.from('reactions').select('post_id').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds).eq('is_deleted', false),
  ]);

  const likesMap = {};
  (likesRes.data || []).forEach((r) => {
    likesMap[r.post_id] = (likesMap[r.post_id] || 0) + 1;
  });

  const commentsMap = {};
  (commentsRes.data || []).forEach((c) => {
    commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1;
  });

  const enriched = posts.map((p) => ({
    id: p.id,
    content: p.content || '',
    created_at: p.created_at,
    media_url: p.post_media?.[0]?.media_url || null,
    likes: likesMap[p.id] || 0,
    comments: commentsMap[p.id] || 0,
    score: (likesMap[p.id] || 0) * 2 + (commentsMap[p.id] || 0) * 3,
  }));

  enriched.sort((a, b) => b.score - a.score);
  return enriched.slice(0, 5);
}

/**
 * Loads audience insights: top faculty, top year, peak engagement hour.
 */
async function loadAudience(profileId) {
  // Get all follower IDs
  const { data: follows } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', profileId);

  const followerIds = (follows || []).map((f) => f.follower_id);
  if (followerIds.length === 0) {
    return { topFaculty: null, topYear: null, peakHour: null, sampleSize: 0 };
  }

  // Fetch their profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, faculty, year_of_study')
    .in('id', followerIds);

  const facultyCounts = {};
  const yearCounts = {};
  (profiles || []).forEach((p) => {
    if (p.faculty) facultyCounts[p.faculty] = (facultyCounts[p.faculty] || 0) + 1;
    if (p.year_of_study) yearCounts[p.year_of_study] = (yearCounts[p.year_of_study] || 0) + 1;
  });

  const topFaculty = Object.entries(facultyCounts).sort((a, b) => b[1] - a[1])[0] || null;
  const topYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0] || null;

  // Peak hour: when your posts get the most likes
  const { data: myPosts } = await supabase
    .from('posts')
    .select('id')
    .eq('author_id', profileId)
    .eq('is_deleted', false);

  const myPostIds = (myPosts || []).map((p) => p.id);
  let peakHour = null;
  if (myPostIds.length > 0) {
    const { data: reactions } = await supabase
      .from('reactions')
      .select('created_at')
      .in('post_id', myPostIds);

    const hourCounts = {};
    (reactions || []).forEach((r) => {
      if (!r.created_at) return;
      const h = new Date(r.created_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });

    const top = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (top) peakHour = parseInt(top[0], 10);
  }

  return {
    topFaculty: topFaculty ? { name: topFaculty[0], count: topFaculty[1] } : null,
    topYear: topYear ? { year: parseInt(topYear[0], 10), count: topYear[1] } : null,
    peakHour,
    sampleSize: followerIds.length,
  };
}

/**
 * Computes deltas between consecutive snapshots.
 * Returns array of { day, newFollowers, newLikes, newComments }
 */
function computeDeltas(snapshots) {
  if (snapshots.length === 0) return [];

  const deltas = [];
  for (let i = 0; i < snapshots.length; i++) {
    const curr = snapshots[i];
    const prev = i > 0 ? snapshots[i - 1] : null;

    const newFollowers = prev ? Math.max(0, curr.follower_count - prev.follower_count) : 0;
    const newLikes = prev
      ? Math.max(0, curr.likes_received - prev.likes_received)
      : curr.likes_on_my_posts_today || 0;
    const newComments = prev
      ? Math.max(0, curr.comments_received - prev.comments_received)
      : curr.comments_on_my_posts_today || 0;

    deltas.push({
      day: curr.day,
      newFollowers,
      newLikes,
      newComments,
    });
  }
  return deltas;
}

export function useProfileStats(profileId, days = 30) {
  const snapshotsQuery = useQuery({
    queryKey: ['stats-snapshots', profileId, days],
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: () => loadSnapshots(profileId, days),
  });

  const totalsQuery = useQuery({
    queryKey: ['stats-totals', profileId],
    enabled: !!profileId,
    staleTime: 60 * 1000,
    queryFn: () => loadTotals(profileId),
  });

  const topPostsQuery = useQuery({
    queryKey: ['stats-top-posts', profileId],
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => loadTopPosts(profileId),
  });

  const audienceQuery = useQuery({
    queryKey: ['stats-audience', profileId],
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000,
    queryFn: () => loadAudience(profileId),
  });

  const snapshots = snapshotsQuery.data || [];
  const deltas = computeDeltas(snapshots);

  return {
    loading: snapshotsQuery.isLoading || totalsQuery.isLoading,
    snapshots,
    deltas,
    totals: totalsQuery.data || { followers: 0, posts: 0, likes: 0, comments: 0 },
    topPosts: topPostsQuery.data || [],
    audience: audienceQuery.data || { topFaculty: null, topYear: null, peakHour: null, sampleSize: 0 },
  };
}
