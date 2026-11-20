import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { tapLight } from '../../lib/haptics';

const REACTIONS = [
  { type: 'like', emoji: '👍', color: '#3b82f6' },
  { type: 'love', emoji: '❤️', color: '#ef4444' },
  { type: 'care', emoji: '🥰', color: '#f59e0b' },
  { type: 'haha', emoji: '😂', color: '#f59e0b' },
  { type: 'wow', emoji: '😮', color: '#f59e0b' },
  { type: 'sad', emoji: '😢', color: '#f59e0b' },
  { type: 'angry', emoji: '😡', color: '#ef4444' },
];

export default function ReactionPicker({ visible, onSelect, onClose }: { visible: boolean, onSelect: (type: string) => void, onClose: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
    } else {
      Animated.timing(scale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => onClose());
    }
  }, [visible]);

  if (!visible && scale === 0) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      {REACTIONS.map((r) => (
        <TouchableOpacity
          key={r.type}
          style={styles.emojiBtn}
          onPress={() => { tapLight(); onSelect(r.type); }}
        >
          <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -50,
    left: 0,
    flexDirection: 'row',
    backgroundColor: '#1f1f1f',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100,
  },
  emojiBtn: { padding: 4 },
});
