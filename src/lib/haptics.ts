import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function tapLight() {
  const enabled = await AsyncStorage.getItem('pref_haptics');
  if (enabled === 'false') return;

  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
}
export async function tapMedium() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}
export async function tapHeavy() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}
