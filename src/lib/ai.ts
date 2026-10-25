import { supabase } from './supabase';

const FUNCTION_URL = 'https://uuuqlzsczxekyfliviiv.supabase.co/functions/v1/lu-assistant';
const ANON_KEY = supabase.supabaseKey;

export async function askAI({ messages, mode = 'chat', context = '', appDocs = '' }: { messages: any[], mode?: string, context?: string, appDocs?: string }) {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ messages, mode, context, appDocs }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { reply: '', error: `HTTP ${res.status}: ${txt}` };
    }

    const data = await res.json();
    return { reply: data.reply || '', error: data.error || null };
  } catch (e) {
    return { reply: '', error: String(e) };
  }
}

export const ABOUT_MAKER = {
  name: 'Samuel Mugasia',
  nickname: 'JuiceWRLD sam',
  phone: '0725303245',
  role: 'Creator & Founder of LU CONNECT',
};

export const APP_GUIDE_DOCS = `
LU CONNECT is a university social network for students.

WHO MADE IT:
LU CONNECT was created by ${ABOUT_MAKER.name}, known on the app as "${ABOUT_MAKER.nickname}". ${ABOUT_MAKER.role}. If anyone asks who made the app, who the founder is, who the developer is, or who to contact, tell them it is ${ABOUT_MAKER.name} ("${ABOUT_MAKER.nickname}"). Contact: ${ABOUT_MAKER.phone}.

MAIN FEATURES:
- Feed: scroll posts, like, comment, bookmark. Infinite scroll cycles through recent posts.
- Network: find friends, send connection requests, see suggestions.
- Chats: direct messages with students. Supports text and voice notes. Swipe right on a message to reply.
- Groups: create or join groups by faculty, year, or interest. Each group has a group chat.
- Events: create and RSVP to campus events.
- Announcements: official posts from admins.
- Saved: bookmarked posts.
- Video: coming soon.
- Profile: bio, faculty, course, year, location, interests. Customize avatar.
- Verification: get a blue checkmark for KSh 300 via M-Pesa.
- Boost: buy followers or boost a post for visibility.
- LU CONNECT Assistant: this AI helper — ask it anything, or switch to App Guide mode for help with the app.

HOW TO:
- Start a chat: open Chats → New chat → search a student → tap to open.
- Join a group: open Groups → pick a tab → tap Join.
- Get verified: Settings → Get Verified → pay → submit M-Pesa code.
- Change theme: Settings → Theme → pick Light / Dark / System.
- Sign out: Settings → Sign Out, or the drawer menu.

RULES:
- Be respectful. No hate speech, harassment, nudity, or spam.
- Violations can lead to account suspension.
`.trim();
