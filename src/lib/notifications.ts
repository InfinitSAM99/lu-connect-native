import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initPushNotifications(userId: string) {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: "0c999e89-770d-4e66-b002-bf398b0a3b87",
    })).data;
    
    console.log('Expo push token generated:', token);

    // 🔥 FIX: Use upsert to update if the user_id already exists
    const { error } = await supabase.from('push_tokens').upsert(
      { 
        user_id: userId, 
        token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' } 
    );
    
    if (error) console.log('Error saving token:', error.message);
    else console.log('Token saved successfully to database!');
    
  } catch (e) {
    console.log('Error getting push token:', e);
  }

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
    await supabase.from('push_tokens').delete().eq('user_id', userId);
  } catch (e) {
    console.log('Error clearing push token:', e);
  }
}
