import AsyncStorage from '@react-native-async-storage/async-storage';
export async function getJSON(key: string) {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export async function setJSON(key: string, value: any) {
  try { if (value === null) await AsyncStorage.removeItem(key); else await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}
