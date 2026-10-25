import { supabase } from './supabase';

type Row = { id: string; author_id?: string; [key: string]: any };

export async function enrichPosts(rows: Row[], myId: string | null) {
  if (!rows || rows.length === 0) return [];

  const postIds = rows.map((p) => p.id);
  const authorIds = [...new Set(rows.map((p) => p.author_id).filter(Boolean))];

  const [authorsRes, mediaRes, reactionsRes, commentsRes, savedRes] =
    await Promise.all([
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
      supabase.from('reactions').select('id, post_id, user_id').in('post_id', postIds),
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

  const authorMap: Record<string, any> = {};
  (authorsRes.data || []).forEach((a: any) => {
    authorMap[a.id] = a;
  });

  const mediaMap: Record<string, any[]> = {};
  (mediaRes.data || []).forEach((m: any) => {
    if (!mediaMap[m.post_id]) mediaMap[m.post_id] = [];
    mediaMap[m.post_id].push(m);
  });

  const likesMap: Record<string, number> = {};
  const myLikes = new Set<string>();
  const likerIdsMap: Record<string, string[]> = {};
  (reactionsRes.data || []).forEach((r: any) => {
    likesMap[r.post_id] = (likesMap[r.post_id] || 0) + 1;
    if (myId && r.user_id === myId) myLikes.add(r.post_id);
    if (!likerIdsMap[r.post_id]) likerIdsMap[r.post_id] = [];
    if (likerIdsMap[r.post_id].length < 3) likerIdsMap[r.post_id].push(r.user_id);
  });

  const uniqueLikerIds = [...new Set(Object.values(likerIdsMap).flat())];
  const likerProfiles: Record<string, any> = {};
  if (uniqueLikerIds.length > 0) {
    const { data: likers } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('is_bot', false)
      .in('id', uniqueLikerIds);
    (likers || []).forEach((l: any) => {
      likerProfiles[l.id] = l;
    });
  }

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
    like_count: likesMap[p.id] || 0,
    liked: myLikes.has(p.id),
    saved: savedSet.has(p.id),
    comment_count: commentCountsMap[p.id] || 0,
    liker_avatars: (likerIdsMap[p.id] || [])
      .map((uid) => likerProfiles[uid])
      .filter(Boolean),
  }));
}
