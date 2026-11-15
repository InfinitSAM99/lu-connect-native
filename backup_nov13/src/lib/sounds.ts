import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const FILES: Record<string, any> = {
  like: require('../../assets/sounds/like.mp3'),
  messageIn: require('../../assets/sounds/message-in.mp3'),
  messageOut: require('../../assets/sounds/message-out.mp3'),
  notification: require('../../assets/sounds/notification.mp3'),
  typing: require('../../assets/sounds/typing.mp3'),
};

const cache: Record<string, any> = {};

async function play(key: string, volume = 1, maxDurationMs?: number) {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });

    if (!cache[key]) {
      cache[key] = createAudioPlayer(FILES[key]);
    }

    const player = cache[key];
    if (!player) return;

    player.volume = volume;
    player.seekTo(0);
    player.play();

    if (maxDurationMs) {
      setTimeout(() => {
        try {
          player.pause();
          player.seekTo(0);
        } catch {}
      }, maxDurationMs);
    }
  } catch (e) {
    console.warn(`[sounds] Failed to play ${key}:`, e);
  }
}

// ---- Public API ----

// Like: trim the original like.mp3 to 200ms
export async function playLike() { await play('like', 0.9, 200); }

export async function playMessageIn() {
  const enabled = await AsyncStorage.getItem('pref_sounds');
  if (enabled === 'false') return;
 await play('messageIn', 0.9, 400); }
export async function playMessageOut() { await play('messageOut', 0.7, 300); }
export async function playNotification() { await play('notification', 0.85, 500); }
export async function playComment() {}

let lastTypingPlay = 0;
export async function playTyping() {
  const now = Date.now();
  if (now - lastTypingPlay < 1200) return;
  lastTypingPlay = now;
  await play('typing', 0.35, 200);
}

export async function playRecordStart() {}
export async function playRecordStop() {}
export async function playFollow() { await play('notification', 0.8, 500); }

export async function preloadAll() {
  await Promise.all(Object.keys(FILES).map((k) => play(k, 0)));
}
export async function primeAudio() { await preloadAll(); }

export async function soundsEnabled(): Promise<boolean> { return true; }
export async function setSoundsEnabled() {}
