import { useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import {
  installForegroundHandler,
  ensureNotificationPermission,
  useNtfy,
} from '@drkostas/expo-ntfy/notify';
import type { NtfyFrame, NotificationText } from '@drkostas/expo-ntfy/proto';
import { supabase } from './supabase';

const BASE_NTFY_URL = (
  process.env.EXPO_PUBLIC_NTFY_URL || 'https://ntfy.sh/lu-connect-students-9f4k2'
).replace(/\/+$/, '');

function getNtfyBaseOrigin(): string {
  const lastSlash = BASE_NTFY_URL.lastIndexOf('/');
  if (lastSlash > 'https://'.length) {
    return BASE_NTFY_URL.slice(0, lastSlash);
  }
  return 'https://ntfy.sh';
}

export function getUserNtfyTopicUrl(userId?: string | null): string {
  if (!userId) return BASE_NTFY_URL;
  return `${getNtfyBaseOrigin()}/lu-connect-user-${userId}`;
}

let activeTopicUrl: string = BASE_NTFY_URL;
const topicListeners = new Set<(url: string) => void>();

function applyNativeTopic(url: string) {
  activeTopicUrl = url;
  topicListeners.forEach((fn) => fn(url));
  if (Platform.OS === 'android') {
    try {
      NativeModules.LuConnectNtfy?.setTopicUrl?.(url);
    } catch (e) {
      console.log('Native ntfy topic update skipped:', e);
    }
  }
}

installForegroundHandler();

export function useLuConnectNtfy(
  onMessage?: (frame: NtfyFrame) => void,
  text: NotificationText = { appName: 'LU Connect', linkPrefix: 'luconnectnative://' },
) {
  const [topicUrl, setTopicUrl] = useState<string>(activeTopicUrl);

  useEffect(() => {
    const listener = (nextUrl: string) => setTopicUrl(nextUrl);
    topicListeners.add(listener);
    setTopicUrl(activeTopicUrl);
    return () => {
      topicListeners.delete(listener);
    };
  }, []);

  return useNtfy(topicUrl, onMessage, { text });
}

export async function initPushNotifications(userId: string) {
  if (!userId) return;

  const userTopicUrl = getUserNtfyTopicUrl(userId);
  applyNativeTopic(userTopicUrl);

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  if (Platform.OS === 'android') {
    console.log('ntfy per-user topic active:', userTopicUrl);
  }

  try {
    const Notifications = await import('expo-notifications');
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) console.log('Error saving token:', error.message);
  } catch (e) {
    console.log('Push token skipped/error:', e);
  }
}

export async function clearPushToken(userId: string) {
  applyNativeTopic(BASE_NTFY_URL);
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId);
  } catch (e) {
    console.log('Error clearing push token:', e);
  }
}
