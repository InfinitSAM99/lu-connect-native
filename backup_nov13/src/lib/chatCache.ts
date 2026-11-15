// @ts-nocheck
/* ============================================================
   Chat cache — localStorage-backed, versioned, per-user.
   ------------------------------------------------------------
   Used by Conversation.jsx and Messages.jsx to hydrate
   instantly on open, then refresh in background.
   ============================================================ */

const PREFIX = 'lu_chat_cache:';
const VERSION = 2;

function key(userId, kind, sub = 'all') {
  return `${PREFIX}v${VERSION}:${userId}:${kind}:${sub}`;
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

/* ---------- conversations list ---------- */
export function readConvList(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(key(userId, 'convs'));
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!parsed?.data) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeConvList(userId, data) {
  if (!userId || !data) return;
  try {
    localStorage.setItem(
      key(userId, 'convs'),
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // storage full — drop oldest message caches to make room
    try {
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${PREFIX}v${VERSION}:${userId}:conv:`)) toDelete.push(k);
      }
      toDelete.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(
        key(userId, 'convs'),
        JSON.stringify({ data, ts: Date.now() })
      );
    } catch {}
  }
}

/* ---------- per-conversation messages ----------
   Keeps only the last N messages to bound storage.
   ------------------------------------------------ */
const MAX_CACHED_MESSAGES = 60;

export function readConvMessages(userId, conversationId) {
  if (!userId || !conversationId) return null;
  try {
    const raw = localStorage.getItem(key(userId, 'conv', conversationId));
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!parsed?.data) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeConvMessages(userId, conversationId, payload) {
  if (!userId || !conversationId || !payload) return;
  try {
    // Trim to last N messages to keep it cheap
    const msgs = payload.messages || [];
    const trimmed = msgs.length > MAX_CACHED_MESSAGES
      ? msgs.slice(-MAX_CACHED_MESSAGES)
      : msgs;
    const toStore = { ...payload, messages: trimmed };
    localStorage.setItem(
      key(userId, 'conv', conversationId),
      JSON.stringify({ data: toStore, ts: Date.now() })
    );
  } catch {
    // ignore storage errors
  }
}

export function removeConvMessages(userId, conversationId) {
  if (!userId || !conversationId) return;
  try {
    localStorage.removeItem(key(userId, 'conv', conversationId));
  } catch {}
}

/* ---------- wipe everything for a user ---------- */
export function clearUserChatCache(userId) {
  if (!userId) return;
  try {
    const prefix = `${PREFIX}v${VERSION}:${userId}:`;
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
