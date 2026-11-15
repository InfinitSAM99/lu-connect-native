import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecordingBar({ ms, onCancel }: { ms: number, onCancel: () => void }) {
  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.redDot} />
        <Text style={styles.time}>{formatTime(ms)}</Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1a0d0f', borderTopWidth: 1, borderTopColor: '#3b1215' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  time: { color: '#fff', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cancelBtn: { padding: 8, backgroundColor: '#ef4444', borderRadius: 20 },
});
