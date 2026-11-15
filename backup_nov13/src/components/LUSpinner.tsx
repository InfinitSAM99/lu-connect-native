import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';

export default function LUSpinner({ size = 64 }: { size?: number }) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 1. Continuous Spin
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000, // 2 seconds per rotation
        easing: Easing.linear,
        useNativeDriver: true, // 60fps native driver
      })
    ).start();

    // 2. Breathing Pulse Glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Interpolate the spin value to 360 degrees
  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [
            { rotate: rotate },
            { scale: pulseValue } // Adds the breathing effect
          ],
        }}
      >
        <Svg viewBox="0 0 200 200" width={size} height={size}>
          {/* Red Frame */}
          <Rect
            x="14" y="14" width="172" height="172" rx="34"
            fill="none" stroke="#ef4444" strokeWidth="8"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* White L */}
          <Path
            d="M 62 60 L 62 130 L 96 130"
            fill="none" stroke="#ffffff" strokeWidth="14"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* White U */}
          <Path
            d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60"
            fill="none" stroke="#ffffff" strokeWidth="14"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
