import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_HOLD = 5000;
const FADE_DURATION = 700;

export default function AssistantSplash({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [minElapsed, setMinElapsed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(0.7)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.7)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.9)).current;
  const glowOpacity = useRef(new Animated.Value(0.7)).current;
  const coreOpacity = useRef(new Animated.Value(0)).current;
  const coreScale = useRef(new Animated.Value(0.7)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(8)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const creditOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Draw core at 800ms
    const t1 = setTimeout(() => {
      setDrawn(true);
      Animated.parallel([
        Animated.timing(coreOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(coreScale, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(300),
          Animated.parallel([
            Animated.timing(titleOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(titleTranslateY, { toValue: 0, duration: 900, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(1200),
          Animated.timing(creditOpacity, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        ]),
      ]).start();
    }, 800);

    // Ring pulse loops
    const startRing = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
      setTimeout(() => {
        Animated.loop(
          Animated.timing(scale, { toValue: 1.15, duration: 2400, useNativeDriver: true })
        ).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.9, duration: 480, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1920, useNativeDriver: true }),
          ])
        ).start();
      }, delay);
    };
    startRing(ring1Scale, ring1Opacity, 0);
    startRing(ring2Scale, ring2Opacity, 600);

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    ).start();

    const t2 = setTimeout(() => setMinElapsed(true), MIN_HOLD);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!minElapsed) return;
    setFading(true);
    Animated.timing(fadeAnim, { toValue: 0, duration: FADE_DURATION, useNativeDriver: true }).start(() => {
      setGone(true);
      onDone?.();
    });
  }, [minElapsed, onDone, fadeAnim]);

  if (gone) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.stage}>
        {/* Ring 1 */}
        <Animated.View style={[
          styles.ring,
          { width: 220, height: 220, borderRadius: 110, borderColor: 'rgba(239,68,68,0.35)', transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
        ]} />
        {/* Ring 2 */}
        <Animated.View style={[
          styles.ring,
          { width: 160, height: 160, borderRadius: 80, borderColor: 'rgba(239,68,68,0.5)', transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
        ]} />
        {/* Glow */}
        <Animated.View style={[
          styles.glow,
          { transform: [{ scale: glowScale }], opacity: glowOpacity },
        ]} />
        {/* Core SVG */}
        <Animated.View style={{ opacity: coreOpacity, transform: [{ scale: coreScale }] }}>
          <Svg width={72} height={72} viewBox="0 0 24 24">
            <Path
              d="M12 2 L13.6 9.2 L21 10.5 L13.6 11.8 L12 19 L10.4 11.8 L3 10.5 L10.4 9.2 Z"
              stroke="#ef4444" strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round"
              fill="none"
            />
            <Circle cx="12" cy="10.5" r="2.2" fill="#ef4444" />
          </Svg>
        </Animated.View>
      </View>

      <Animated.Text style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]}>
        ASSISTANT
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Ask anything about LU CONNECT
      </Animated.Text>

      <Animated.Text style={[styles.credit, { opacity: creditOpacity, bottom: Math.max(32, insets.bottom) + 8 }]}>
        by Samuel Mugasia
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  stage: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5 },
  glow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(239,68,68,0.25)' },
  title: { marginTop: 48, fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 4 },
  subtitle: { marginTop: 12, fontSize: 13, color: '#6d7382', letterSpacing: 1.2 },
  credit: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 12, color: '#6d7382', letterSpacing: 0.6 },
});
