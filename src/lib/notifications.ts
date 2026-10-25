import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initPushNotifications(userId: string) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Save token to Supabase
    await supabase.from('push_tokens').upsert({
      user_id: userId,
      token,
      platform: Platform.OS,
    });
  } catch (e) {
    console.warn('Push notification init failed', e);
  }
}

export async function clearPushToken(userId: string) {
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId);
  } catch (e) {}
}
