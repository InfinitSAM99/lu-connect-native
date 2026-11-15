import { supabase } from './supabase';

type Row = { id: string; author_id?: string; [key: string]: any };

export async function enrichPosts(rows: Row[], myId: string | null) {
  if (!rows || rows.length === 0) return [];
  const postIds = rows.map((p) => p.id);
  const authorIds = [...new Set(rows.map((p) => p.author_id).filter(Boolean))];

  const [authorsRes, mediaRes, reactionsRes, commentsRes, savedRes] = await Promise.all([
    authorIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, avatar_url, is_verified, is_broadcast_only, is_bot')
          .in('id', authorIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('post_media')
      .select('id, post_id, media_url, sort_order')
      .in('post_id', postIds)
      .order('sort_order'),
    supabase.from('reactions').select('*').in('post_id', postIds),
    supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds)
      .eq('is_deleted', false),
    myId
      ? supabase
          .from('saved_posts')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', myId)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // 🔥 ADDED DEBUG LOGS HERE
  if (reactionsRes.error) {
    console.log('🚨 REACTIONS FETCH ERROR:', reactionsRes.error);
  } else {
    console.log(`✅ FETCHED ${reactionsRes.data?.length || 0} REACTIONS for ${postIds.length} posts.`);
    if (reactionsRes.data?.length > 0) {
       console.log('Sample reaction data:', reactionsRes.data[0]);
    }
  }

  const authorMap: Record<string, any> = {};
  (authorsRes.data || []).forEach((a: any) => {
    authorMap[a.id] = a;
  });

  const mediaMap: Record<string, any[]> = {};
  (mediaRes.data || []).forEach((m: any) => {
    if (!mediaMap[m.post_id]) mediaMap[m.post_id] = [];
    mediaMap[m.post_id].push(m);
  });

  const upvotesMap: Record<string, number> = {};
  const downvotesMap: Record<string, number> = {};
  const myVoteMap: Record<string, 'up' | 'down'> = {};

  (reactionsRes.data || []).forEach((r: any) => {
    const type = r.reaction_type;
    if (type === 'up') {
      upvotesMap[r.post_id] = (upvotesMap[r.post_id] || 0) + 1;
    } else if (type === 'down') {
      downvotesMap[r.post_id] = (downvotesMap[r.post_id] || 0) + 1;
    }
    if (myId && r.user_id === myId) {
      myVoteMap[r.post_id] = type === 'up' ? 'up' : type === 'down' ? 'down' : null;
    }
  });

  const commentCountsMap: Record<string, number> = {};
  (commentsRes.data || []).forEach((c: any) => {
    commentCountsMap[c.post_id] = (commentCountsMap[c.post_id] || 0) + 1;
  });

  const savedSet = new Set<string>();
  (savedRes.data || []).forEach((s: any) => savedSet.add(s.post_id));

  return rows.map((p) => ({
    ...p,
    profiles: authorMap[p.author_id!] || p.profiles || null,
    post_media: mediaMap[p.id] || p.post_media || [],
    upvotes: upvotesMap[p.id] || 0,
    downvotes: downvotesMap[p.id] || 0,
    my_vote: myVoteMap[p.id] || null,
    saved: savedSet.has(p.id),
    comment_count: commentCountsMap[p.id] || 0,
  }));
}
