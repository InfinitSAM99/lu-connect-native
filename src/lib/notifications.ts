import React, { useEffect, useRef, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  ensureNotificationPermission,
  useNtfy,
} from '@drkostas/expo-ntfy/notify';
import type { NtfyFrame, NotificationText } from '@drkostas/expo-ntfy/proto';
import { supabase } from './supabase';

const BASE_NTFY_URL = (
  process.env.EXPO_PUBLIC_NTFY_URL || 'https://ntfy.sh/lu-connect-students-9f4k2'
).replace(/\/+$/, '');

const ANDROID_CHANNEL_ID = 'lu_connect_alerts_v2'; // Changed to v2 to force Android to update settings

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 1. Set up the Quick Reply Category
Notifications.setNotificationCategoryAsync('message-reply', [
  {
    identifier: 'reply',
    buttonTitle: 'Reply',
    textInput: {
      submitButtonTitle: 'Send',
      placeholder: 'Type your message...',
    },
  },
]).catch((err) => console.log('Failed to set category:', err));

async function ensureAndroidAlertChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'LU Connect Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  } catch (e) {
    console.log('Failed to create notification channel:', e);
  }
}

void ensureAndroidAlertChannel();

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

const recentAlertKeys = new Set<string>();

function rememberAlertKey(key: string): boolean {
  if (!key) return true;
  if (recentAlertKeys.has(key)) return false;
  recentAlertKeys.add(key);
  if (recentAlertKeys.size > 100) {
    const first = recentAlertKeys.values().next().value;
    if (first) recentAlertKeys.delete(first);
  }
  return true;
}

async function presentBannerNotification(params: {
  dedupeKey: string;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown>;
}) {
  if (!params.body && !params.title) return;
  if (!rememberAlertKey(params.dedupeKey)) return;

  try {
    await ensureAndroidAlertChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title || 'LU Connect',
        body: params.body || 'New notification',
        sound: 'default',
        categoryIdentifier: params.data?.tags?.includes('chat') ? 'message-reply' : undefined,
        data: params.data ?? {},
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.log('Failed to display local notification:', e);
  }
}

export function useLuConnectNtfy(
  onMessage?: (frame: NtfyFrame) => void,
  text: NotificationText = { appName: 'LU Connect', linkPrefix: 'luconnectnative://' },
) {
  const [topicUrl, setTopicUrl] = useState<string>(activeTopicUrl);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const listener = (nextUrl: string) => setTopicUrl(nextUrl);
    topicListeners.add(listener);
    setTopicUrl(activeTopicUrl);
    return () => {
      topicListeners.delete(listener);
    };
  }, []);

  return useNtfy(
    topicUrl,
    (frame: NtfyFrame) => {
      if (frame.event === 'message' && frame.message) {
        const key = `${frame.title ?? ''}|${frame.message}`;
        void presentBannerNotification({
          dedupeKey: key,
          title: frame.title,
          body: frame.message,
          data: {
            topic: frame.topic,
            tags: frame.tags ?? [],
            click: frame.click,
            type: frame.tags?.includes('chat') ? 'chat' : 'alert',
          },
        });
      }
      onMessageRef.current?.(frame);
    },
    { text },
  );
}

export function UserNtfySubscriber({ userId }: { userId?: string | null }) {
  useLuConnectNtfy();

  useEffect(() => {
    if (!userId) {
      applyNativeTopic(BASE_NTFY_URL);
      return;
    }

    applyNativeTopic(getUserNtfyTopicUrl(userId));
    void ensureAndroidAlertChannel();

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            title?: string | null;
            body?: string | null;
            type?: string | null;
            link?: string | null;
            reference_id?: string | null;
          };
          const key = `${row.title ?? ''}|${row.body ?? ''}`;
          void presentBannerNotification({
            dedupeKey: key,
            title: row.title,
            body: row.body,
            data: {
              notificationId: row.id,
              type: row.type,
              link: row.link,
              referenceId: row.reference_id,
              tags: ['chat'], // Force chat tag for Supabase notifications to trigger the reply button
            },
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}

export async function initPushNotifications(userId: string) {
  if (!userId) return;

  const userTopicUrl = getUserNtfyTopicUrl(userId);
  applyNativeTopic(userTopicUrl);

  await ensureAndroidAlertChannel();
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  if (Platform.OS === 'android') {
    console.log('ntfy per-user topic active:', userTopicUrl);
  }

  try {
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

    if (error) console.log('Error saving token to Supabase:', error.message);
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
