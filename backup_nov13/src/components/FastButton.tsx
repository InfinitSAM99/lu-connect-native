import React from 'react';
import { Pressable, ViewStyle, StyleProp } from 'react-native';

interface FastButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function FastButton({ onPress, onLongPress, style, children, disabled }: FastButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      android_ripple={{ color: 'transparent' }}
      // Remove any delay on press
      unstable_pressDelay={0}
      style={[style, { opacity: 1 }]}
      hitSlop={8}
    >
      {children}
    </Pressable>
  );
}
