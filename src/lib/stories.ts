import { supabase } from './supabase';

export type Story = {
  id: string;
  user_id: string;
  story_type: 'image' | 'video' | 'text';
  media_url: string | null;
  thumbnail_url: string | null;
  text_content: string | null;
  background_color: string | null;
  audience: string;
  expires_at: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    subscription_tier: string;
  };
  has_viewed?: boolean;
};

export async function fetchActiveStories(myId: string) {
  // 1. Fetch stories from the last 24 hours
  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      *,
      profiles:user_id (full_name, avatar_url, subscription_tier)
    `)
    .gt('expires_at', new Date().toISOString())
    .neq('user_id', myId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 2. Check which stories I have already viewed
  const { data: views } = await supabase
    .from('story_views')
    .select('story_id')
    .eq('viewer_id', myId);

  const viewedSet = new Set((views || []).map(v => v.story_id));

  // 3. Group by user
  const grouped: Record<string, Story[]> = {};
  stories?.forEach((s: any) => {
    if (!grouped[s.user_id]) grouped[s.user_id] = [];
    grouped[s.user_id].push({
      ...s,
      has_viewed: viewedSet.has(s.id)
    });
  });

  // 4. SORTING LOGIC: Unseen first, then seen
  const sortedGroups = Object.values(grouped).sort((a, b) => {
    const aHasUnseen = a.some(s => !s.has_viewed);
    const bHasUnseen = b.some(s => !s.has_viewed);
    
    if (aHasUnseen && !bHasUnseen) return -1;
    if (!aHasUnseen && bHasUnseen) return 1;

    const aNewest = new Date(a[0].created_at).getTime();
    const bNewest = new Date(b[0].created_at).getTime();
    return bNewest - aNewest;
  });

  return sortedGroups;
}

export async function fetchMyStory(myId: string) {
  const { data } = await supabase
    .from('stories')
    .select('*, profiles:user_id (full_name, avatar_url, subscription_tier)')
    .eq('user_id', myId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return data || [];
}

export async function recordStoryView(storyId: string, myId: string) {
  await supabase.from('story_views').insert({ story_id: storyId, viewer_id: myId });
}

export async function reactToStory(storyId: string, myId: string, reaction: string) {
  await supabase.from('story_reactions').upsert({ story_id: storyId, user_id: myId, reaction_type: reaction }, { onConflict: 'story_id,user_id' });
}

export async function createStory(payload: any, myId: string) {
  const { data, error } = await supabase.from('stories').insert({
    user_id: myId,
    ...payload,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).select().single();

  if (error) throw error;
  return data;
}
