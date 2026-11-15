import React from 'react';
import { Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';

interface AppButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  disabled?: boolean;
}

export default function AppButton({ onPress, onLongPress, style, children, disabled }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
      style={({ pressed }) => [
        style,
        {
          opacity: pressed && Platform.OS === 'ios' ? 0.7 : 1, // iOS feedback
        },
      ]}
    >
      {children}
    </Pressable>
  );
}
