import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function LULogo({ size = 44, animate = true }: { size?: number, animate?: boolean }) {
  // Starting values from your CSS (stroke-dasharray: 800, stroke-dashoffset: 800)
  const frameOffset = useRef(new Animated.Value(animate ? 800 : 0)).current;
  const lOffset = useRef(new Animated.Value(animate ? 400 : 0)).current;
  const uOffset = useRef(new Animated.Value(animate ? 400 : 0)).current;
  
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowStrokeWidth = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (!animate) return;

    // Exact timings from your global.css
    Animated.sequence([
      // 1. Draw Frame (0ms -> 1800ms)
      Animated.timing(frameOffset, { toValue: 0, duration: 1800, useNativeDriver: false }),
      // 2. Draw Letters (Starts at 1500ms, we offset the delay)
      Animated.parallel([
        Animated.timing(lOffset, { toValue: 0, duration: 1100, useNativeDriver: false }),
        Animated.timing(uOffset, { toValue: 0, duration: 1300, delay: 900, useNativeDriver: false }),
      ])
    ]).start();

    // 3. Glow Pulse starts at 3800ms
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 0.9, duration: 1680, useNativeDriver: false }),
            Animated.timing(glowStrokeWidth, { toValue: 24, duration: 1680, useNativeDriver: false }),
          ]),
          Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 0, duration: 720, useNativeDriver: false }),
            Animated.timing(glowStrokeWidth, { toValue: 24, duration: 720, useNativeDriver: false }),
          ]),
        ])
      ).start();
    }, 3800);

    return () => clearTimeout(t);
  }, [animate]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 200 200" width={size} height={size}>
        {/* Frame */}
        <AnimatedRect 
          x="14" y="14" width="172" height="172" rx="34"
          fill="none" stroke="#ef4444" strokeWidth={6}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="800" strokeDashoffset={frameOffset}
        />
        
        {/* L */}
        <AnimatedPath 
          d="M 62 60 L 62 130 L 96 130" 
          fill="none" stroke="#ffffff" strokeWidth={10} 
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="400" strokeDashoffset={lOffset}
        />
        
        {/* U */}
        <AnimatedPath 
          d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" 
          fill="none" stroke="#ffffff" strokeWidth={10} 
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="400" strokeDashoffset={uOffset}
        />
        
        {/* Glow */}
        <AnimatedRect 
          x="14" y="14" width="172" height="172" rx="34"
          fill="none" stroke="#ef4444"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: glowOpacity, strokeWidth: glowStrokeWidth }}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  }
});
