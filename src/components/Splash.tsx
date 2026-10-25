import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function Splash({ onDone }: { onDone: () => void }) {
  const { loading } = useAuth();
  const [gone, setGone] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const stageScale = useRef(new Animated.Value(0.85)).current;
  const stageOpacity = useRef(new Animated.Value(0)).current;
  
  const frameOffset = useRef(new Animated.Value(800)).current;
  const lOffset = useRef(new Animated.Value(400)).current;
  const uOffset = useRef(new Animated.Value(400)).current;
  
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowStrokeWidth = useRef(new Animated.Value(6)).current;
  
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    // 1. Stage Scale In (0ms -> 800ms)
    Animated.parallel([
      Animated.timing(stageScale, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(stageOpacity, { toValue: 1, duration: 800, useNativeDriver: false }),
    ]).start();

    // 2. Draw Frame (Right, Down, Left, Up)
    Animated.timing(frameOffset, { toValue: 0, duration: 1800, useNativeDriver: false }).start();

    // 3. Draw L (1500ms)
    Animated.timing(lOffset, { toValue: 0, duration: 1100, delay: 1500, useNativeDriver: false }).start();

    // 4. Draw U (2400ms)
    Animated.timing(uOffset, { toValue: 0, duration: 1300, delay: 2400, useNativeDriver: false }).start();

    // 5. Glow & Text (3800ms)
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]).start();

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

    // 6. Hold for 6.5 seconds minimum before fading out
    const timeout = setTimeout(() => setMinElapsed(true), 6500);
    return () => { clearTimeout(timeout); clearTimeout(t); };
  }, []);

  // 7. Fade out to Login/Feed
  useEffect(() => {
    if (!minElapsed || loading) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 700, useNativeDriver: false }).start(() => {
      setGone(true);
      if (onDone) onDone();
    });
  }, [minElapsed, loading, fadeAnim, onDone]);

  if (gone) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      
      {/* The `flex: 1` + `justifyContent: 'center'` in styles.container 
          guarantees this whole block is DEAD CENTER */}
      
      <Animated.View style={[
        styles.stage, 
        { opacity: stageOpacity, transform: [{ scale: stageScale }] }
      ]}>
        <Svg viewBox="0 0 200 200" width={220} height={220}>
          {/* Frame draws Right, Down, Left, Up based on SVG shape */}
          <AnimatedRect 
            x="14" y="14" width="172" height="172" rx="34"
            fill="none" stroke="#ef4444" strokeWidth={6}
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="800" strokeDashoffset={frameOffset}
          />
          {/* Letter L */}
          <AnimatedPath 
            d="M 62 60 L 62 130 L 96 130" 
            fill="none" stroke="#ffffff" strokeWidth={10} 
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="400" strokeDashoffset={lOffset}
          />
          {/* Letter U */}
          <AnimatedPath 
            d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" 
            fill="none" stroke="#ffffff" strokeWidth={10} 
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="400" strokeDashoffset={uOffset}
          />
          {/* Glow Pulse */}
          <AnimatedRect 
            x="14" y="14" width="172" height="172" rx="34"
            fill="none" stroke="#ef4444"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: glowOpacity, strokeWidth: glowStrokeWidth }}
          />
        </Svg>
      </Animated.View>

      <Animated.View style={{
        opacity: textOpacity,
        transform: [{ translateY: textTranslateY }],
        marginTop: 28, 
      }}>
        <Text style={styles.creditText}>by Samuel Mugasia</Text>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    flex: 1,
    alignItems: 'center',      // Horizontal Center
    justifyContent: 'center',  // Vertical Center
    zIndex: 9999,
  },
  stage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditText: {
    fontSize: 12,
    color: '#6d7382',
    letterSpacing: 0.8,
    textAlign: 'center',
    fontFamily: 'System',
  }
});
