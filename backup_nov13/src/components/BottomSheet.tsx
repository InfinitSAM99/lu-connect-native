import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, Dimensions, Platform, Keyboard } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

export default function BottomSheet({ open, onClose, children, maxHeight }: { open: boolean, onClose: () => void, children: React.ReactNode, maxHeight?: string }) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 90, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 250, useNativeDriver: true })
      ]).start();
    }
  }, [open]);

  if (!open) return null;

  const heightPercent = maxHeight ? maxHeight.replace('vh', '') : '90';

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View 
          style={[
            styles.sheet, 
            { 
              height: `${heightPercent}%`, // Force full height
              transform: [{ translateY }],
              paddingBottom: Math.max(keyboardHeight, Platform.OS === 'ios' ? 34 : 0)
            }
          ]}
        >
          <View style={styles.handleWrapper}>
            <View style={styles.handle} />
          </View>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {children}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleWrapper: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, backgroundColor: '#000' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333333' },
});
