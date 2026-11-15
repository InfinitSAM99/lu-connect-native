import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'lu_device_unique_id';

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
