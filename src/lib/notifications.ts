import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 1. Configure how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return;
  }

  // 2. Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  // 3. Get the token
  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: "0c999e89-770d-4e66-b002-bf398b0a3b87",
    })).data;
    console.log('Expo push token:', token);

    // 4. Save the token to the database so we can send notifications to this user
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch (e) {
    console.log('Error getting push token:', e);
  }

  // 5. Android specific channel setup
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ef4444',
    });
  }
}

export async function clearPushToken(userId: string) {
  try {
    await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
  } catch (e) {
    console.log('Error clearing push token:', e);
  }
}
