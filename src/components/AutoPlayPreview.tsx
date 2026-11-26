import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AutoPlayPreview() {
  // Animation Values
  const topBarOpacity = useRef(new Animated.Value(1)).current;
  const topBarY = useRef(new Animated.Value(0)).current;

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
          Animated.timing(topBarOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(topBarY, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
          Animated.timing(radialOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(radialScale, { toValue: 0.5, duration: 200, useNativeDriver: true }),
          Animated.timing(item1Y, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(item2Y, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(item3Y, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.delay(3500), // Wait 3.5 seconds

        // --- PHASE 2: HIDE TOP BAR, SHOW RADIAL ---
        Animated.parallel([
          Animated.timing(topBarOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(topBarY, { toValue: -40, duration: 300, useNativeDriver: true }),
          Animated.timing(radialOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(radialScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(item1Y, { toValue: -50, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.timing(item2Y, { toValue: -40, duration: 350, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.timing(item3Y, { toValue: -30, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        ]),
        Animated.delay(3500), // Wait 3.5 seconds

        // --- PHASE 3: COLLAPSE RADIAL ---
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
    <View style={styles.phoneWrapper}>
      <View style={styles.phoneFrame}>
        
        {/* Status Bar & Notch */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.notch} />
          <View style={styles.statusIcons}>
            <Ionicons name="cellular" size={12} color="#fff" />
            <Ionicons name="wifi" size={12} color="#fff" />
            <Ionicons name="battery-full" size={14} color="#fff" />
          </View>
        </View>

        <View style={styles.screen}>
          
          {/* LU Header */}
          <View style={styles.fakeHeader}>
            <View style={styles.fakeLogo}><Text style={styles.logoText}>LU</Text></View>
            <View style={styles.headerIcons}>
              <Ionicons name="search" size={16} color="#6d7382" />
              <Ionicons name="add" size={20} color="#6d7382" />
            </View>
          </View>

          {/* Top Nav Mockup */}
          <Animated.View style={[styles.topBarContainer, { opacity: topBarOpacity, transform: [{ translateY: topBarY }] }]}>
            <View style={styles.topBarIcons}>
              <View style={styles.activeNavItem}>
                <Ionicons name="home" size={18} color="#fff" />
                <View style={styles.activeIndicator} />
              </View>
              <Ionicons name="people-outline" size={18} color="#6d7382" />
              <Ionicons name="chatbubble-outline" size={18} color="#6d7382" />
              <Ionicons name="notifications-outline" size={18} color="#6d7382" />
              <Ionicons name="play-circle-outline" size={18} color="#6d7382" />
            </View>
          </Animated.View>

          {/* Fake Feed Content */}
          <View style={styles.contentContainer}>
            <FakePost />
            <FakePost />
            <FakePost />
          </View>

          {/* Radial Menu Mockup */}
          <View style={styles.radialContainer}>
            <Animated.View style={[styles.radialCenter, { opacity: radialOpacity, transform: [{ scale: radialScale }] }]}>
              <Ionicons name="add" size={26} color="#fff" />
            </Animated.View>

            <Animated.View style={[styles.radialItem, { left: '28%', opacity: radialOpacity, transform: [{ translateY: item1Y }] }]}>
               <Ionicons name="home" size={14} color="#fff" />
            </Animated.View>
            <Animated.View style={[styles.radialItem, { left: '36%', opacity: radialOpacity, transform: [{ translateY: item2Y }] }]}>
               <Ionicons name="people" size={14} color="#fff" />
            </Animated.View>
            <Animated.View style={[styles.radialItem, { right: '36%', opacity: radialOpacity, transform: [{ translateY: item3Y }] }]}>
               <Ionicons name="chatbubble" size={14} color="#fff" />
            </Animated.View>
          </View>

        </View>
      </View>
    </View>
  );
}

// Reusable Fake Post Component
function FakePost() {
  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar} />
        <View style={{ flex: 1 }}>
          <View style={styles.postName} />
          <View style={styles.postTime} />
        </View>
        <Ionicons name="ellipsis-horizontal" size={14} color="#333" />
      </View>
      <View style={styles.postText} />
      <View style={styles.postTextShort} />
      <View style={styles.postImage} />
      <View style={styles.postActions}>
        <Ionicons name="heart-outline" size={16} color="#6d7382" />
        <Ionicons name="chatbubble-outline" size={16} color="#6d7382" />
        <Ionicons name="arrow-redo-outline" size={16} color="#6d7382" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneWrapper: { alignItems: 'center', marginBottom: 32 },
  phoneFrame: {
    width: 260,
    height: 520,
    borderRadius: 44,
    backgroundColor: '#000',
    borderWidth: 7,
    borderColor: '#1f1f1f',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 100,
  },
  statusTime: { color: '#fff', fontSize: 11, fontWeight: '600' },
  statusIcons: { flexDirection: 'row', gap: 4 },
  notch: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: 70,
    height: 18,
    backgroundColor: '#1f1f1f',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  fakeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  fakeLogo: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#ef4444', fontSize: 10, fontWeight: '900' },
  headerIcons: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  // TOP BAR
  topBarContainer: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 10, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', paddingBottom: 8 },
  topBarIcons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeNavItem: { alignItems: 'center' },
  activeIndicator: { width: 16, height: 2, backgroundColor: '#ef4444', marginTop: 4, borderRadius: 2 },

  // CONTENT
  contentContainer: { gap: 12, marginTop: 50 },
  postContainer: { backgroundColor: '#111', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  postAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#222' },
  postName: { width: 60, height: 6, borderRadius: 3, backgroundColor: '#333', marginBottom: 4 },
  postTime: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#222' },
  postText: { width: '90%', height: 6, borderRadius: 3, backgroundColor: '#222', marginBottom: 4 },
  postTextShort: { width: '60%', height: 6, borderRadius: 3, backgroundColor: '#222', marginBottom: 10 },
  postImage: { width: '100%', height: 100, borderRadius: 8, backgroundColor: '#1a1a1a', marginBottom: 10 },
  postActions: { flexDirection: 'row', gap: 14 },

  // RADIAL
  radialContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  radialCenter: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', zIndex: 20, borderWidth: 3, borderColor: '#000', shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 10 },
  radialItem: { position: 'absolute', bottom: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', zIndex: 15, borderWidth: 1, borderColor: '#333' },
});
