import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RINGTONE_OPTIONS = [
  { id: 'app_default', name: 'LU Connect (Inbuilt)' },
  { id: 'system', name: 'System Default (Phone)' },
];

let currentPlayer: AudioPlayer | null = null;

export async function playRingtone() {
  try {
    const soundsEnabled = await AsyncStorage.getItem('pref_sounds');
    if (soundsEnabled === 'false') return;

    if (currentPlayer) {
      currentPlayer.pause();
      currentPlayer.remove();
      currentPlayer = null;
    }

    const savedId = await AsyncStorage.getItem('pref_ringtone_id');
    const localAsset = require('../../assets/sounds/default_ring.mp3');

    currentPlayer = createAudioPlayer(localAsset);
    currentPlayer.loop = true;
    currentPlayer.play();
  } catch (error) {
    console.log("Ringtone Error:", error);
  }
}

export async function stopRingtone() {
  try {
    if (currentPlayer) {
      currentPlayer.pause();
      currentPlayer.remove();
      currentPlayer = null;
    }
  } catch (error) {
    console.log("Stop Ringtone Error:", error);
  }
}
