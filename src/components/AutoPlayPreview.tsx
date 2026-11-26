import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AutoPlayPreview() {
  // Animations
  const topBarOpacity = useRef(new Animated.Value(0)).current;
  const topBarY = useRef(new Animated.Value(-40)).current;
  
  const radialOpacity = useRef(new Animated.Value(0)).current;
  const radialScale = useRef(new Animated.Value(0.5)).current;
  const item1Y = useRef(new Animated.Value(0)).current;
  const item2Y = useRef(new Animated.Value(0)).current;
  const item3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        // --- PHASE 1: SHOW TOP BAR ---
        Animated.parallel([
          // Top Bar comes in
          Animated.timing(topBarOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(topBarY, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
          // Radial Menu goes away
          Animated.timing(radialOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(radialScale, { toValue: 0.5, duration: 200, useNativeDriver: true }),
          Animated.timing(item1Y, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(item2Y, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(item3Y, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.delay(3000), // Wait 3 seconds

        // --- PHASE 2: HIDE TOP BAR, SHOW RADIAL ---
        Animated.parallel([
          // Top Bar goes away
          Animated.timing(topBarOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(topBarY, { toValue: -40, duration: 300, useNativeDriver: true }),
          
          // Radial Menu comes in
          Animated.timing(radialOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(radialScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ]),
        // Expand Radial Menu Items
        Animated.parallel([
          Animated.timing(item1Y, { toValue: -50, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.timing(item2Y, { toValue: -40, duration: 350, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.timing(item3Y, { toValue: -30, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        ]),
        Animated.delay(3000), // Wait 3 seconds

        // --- PHASE 3: COLLAPSE RADIAL (LOOP BACK TO TOP) ---
        Animated.parallel([
          Animated.timing(radialOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(radialScale, { toValue: 0.5, duration: 200, useNativeDriver: true }),
          Animated.timing(item1Y, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(item2Y, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(item3Y, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.phoneFrame}>
      {/* NOTCH */}
      <View style={styles.notch} />
      
      {/* SCREEN CONTENT */}
      <View style={styles.screen}>
        
        {/* FAKE HEADER */}
        <View style={styles.fakeHeader}>
          <View style={styles.fakeLogo}><Text style={styles.logoText}>LU</Text></View>
          <View style={styles.fakeLine} />
        </View>

        {/* --- TOP BAR MOCKUP --- */}
        <Animated.View style={[styles.topBarContainer, { opacity: topBarOpacity, transform: [{ translateY: topBarY }] }]}>
          <View style={styles.topBarIcons}>
            <Ionicons name="home-outline" size={18} color="#fff" />
            <Ionicons name="people-outline" size={18} color="#fff" />
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Ionicons name="play-circle-outline" size={18} color="#fff" />
          </View>
          <View style={styles.divider} />
        </Animated.View>

        {/* FAKE FEED CONTENT (Shows behind both navs) */}
        <View style={styles.contentContainer}>
          <View style={styles.fakePost} />
          <View style={styles.fakePost} />
          <View style={styles.fakePost} />
        </View>

        {/* --- RADIAL MENU MOCKUP --- */}
        <View style={styles.radialContainer}>
          {/* The Center Button */}
          <Animated.View style={[styles.radialCenter, { opacity: radialOpacity, transform: [{ scale: radialScale }] }]}>
            <Ionicons name="add" size={26} color="#fff" />
          </Animated.View>

          {/* Expanding Items */}
          <Animated.View style={[styles.radialItem, { opacity: radialOpacity, transform: [{ translateY: item1Y }] }]}>
             <Ionicons name="home" size={14} color="#fff" />
          </Animated.View>
          <Animated.View style={[styles.radialItem, { left: '30%', opacity: radialOpacity, transform: [{ translateY: item2Y }] }]}>
             <Ionicons name="people" size={14} color="#fff" />
          </Animated.View>
          <Animated.View style={[styles.radialItem, { right: '30%', opacity: radialOpacity, transform: [{ translateY: item3Y }] }]}>
             <Ionicons name="chatbubble" size={14} color="#fff" />
          </Animated.View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneFrame: {
    width: 240,
    height: 480, // Tall like a real phone
    borderRadius: 36,
    backgroundColor: '#000',
    borderWidth: 6,
    borderColor: '#1f1f1f',
    alignSelf: 'center',
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  notch: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 100,
    height: 20,
    backgroundColor: '#1f1f1f',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 100,
  },
  screen: {
    flex: 1,
    paddingTop: 36, // Space for notch
    paddingHorizontal: 16,
    backgroundColor: '#000',
  },
  fakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fakeLogo: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center'
  },
  logoText: { color: '#ef4444', fontSize: 9, fontWeight: '900' },
  fakeLine: { width: 50, height: 6, borderRadius: 3, backgroundColor: '#1f1f1f' },

  // Top Bar
  topBarContainer: {
    position: 'absolute',
    top: 76,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  topBarIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f1f1f',
  },

  // Feed Content
  contentContainer: {
    flex: 1,
    gap: 12,
    marginTop: 10,
  },
  fakePost: {
    height: 100,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },

  // Radial
  radialContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  radialCenter: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
    borderWidth: 2, borderColor: '#000',
  },
  radialItem: {
    position: 'absolute',
    bottom: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1f1f1f',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 15,
    borderWidth: 1, borderColor: '#333',
  },
});
