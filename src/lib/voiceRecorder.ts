import { AudioRecorder, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

export function isRecordingSupported() {
  return true;
}

export function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function createVoiceRecorder() {
  let recorder: AudioRecorder | null = null;
  let startTime = 0;

  async function start() {
    if (recorder) throw new Error('Already recording');

    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') throw new Error('Microphone permission denied');

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });

    recorder = new AudioRecorder({
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    });

    await recorder.record();
    startTime = Date.now();
  }

  async function stop() {
    if (!recorder) throw new Error('Not recording');

    try {
      const uri = await recorder.stop();
      const duration = Date.now() - startTime;
      recorder = null;

      if (!uri) throw new Error('No recording URI generated');

      const response = await fetch(uri);
      const blob = await response.blob();

      return { blob, duration, mimeType: 'audio/m4a' };
    } catch (err) {
      recorder = null;
      throw err;
    }
  }

  async function cancel() {
    if (!recorder) return;
    try {
      await recorder.stop();
    } catch (e) {}
    recorder = null;
  }

  function isRecording() {
    return !!recorder;
  }

  return { start, stop, cancel, isRecording };
}
