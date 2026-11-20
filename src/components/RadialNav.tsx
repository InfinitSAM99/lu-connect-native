import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import LULogo from './LULogo';
import FastButton from './FastButton';

const { width: SCREEN_W } = Dimensions.get('window');

// Reverted to original sizes for the clean look
const RADIUS = 70;
const BUTTON_SIZE = 50;
const ICON_SIZE = 36;
const CYCLE_MS = 4400;

const BASE_NAV_ITEMS = [
  { to: 'Profile',       label: 'Profile',       icon: 'person' },
  { to: 'Notifications', label: 'Notifications', icon: 'notifications' },
  { to: 'Video',         label: 'Video',         icon: 'videocam' },
  { to: 'Messages',      label: 'Chats',         icon: 'chatbubbles' },
  { to: 'Connections',   label: 'Network',       icon: 'people-circle' },
  { to: 'Menu',          label: 'Menu',          icon: 'menu' },
  { to: 'Feed',          label: 'Home',          icon: 'home' },
];

export default function RadialNav({ unreadMessages = 0 }: any) {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState(0);

  const navItems = BASE_NAV_ITEMS;

  // Semicircle positions
  const positions = navItems.map((_, i) => {
    const t = i / (navItems.length - 1);
    const angle = Math.PI - t * Math.PI;
    return {
      x: Math.cos(angle) * RADIUS,
      y: -Math.sin(angle) * RADIUS,
    };
  });

  const openAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) closeMenu();
  }, [routeName]);

  const openMenu = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(openAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }),
      Animated.timing(rotateAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(openAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const handleNav = (to: string) => {
    closeMenu();
    if (routeName !== to) {
      if (to === 'Profile') {
        navigation.navigate('Profile', { id: profile?.id });
      } else {
        navigation.navigate(to);
      }
    }
  };

  const handleLuTap = () => {
    if (open) {
      closeMenu();
      navigation.navigate('AIAssistant');
    } else {
      openMenu();
    }
  };

  const luRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const luScale = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <>
      {open && (
        <FastButton
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 45 }]}
          onPress={closeMenu}
        >
          <View style={StyleSheet.absoluteFill} />
        </FastButton>
      )}

      <View
        style={[
          styles.wrapper,
          { bottom: (Platform.OS === 'ios' ? 34 : 24) + 20 }
        ]}
        pointerEvents="box-none"
      >
        {navItems.map((item, i) => {
          const { x, y } = positions[i];
          const isActive = routeName === item.to;

          const translateX = openAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, x],
          });
          const translateY = openAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, y],
          });
          const scale = openAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          });

          return (
            <Animated.View
              key={item.to}
              style={{
                position: 'absolute',
                left: -ICON_SIZE / 2,
                top: -ICON_SIZE / 2,
                width: ICON_SIZE,
                height: ICON_SIZE,
                opacity: openAnim,
                transform: [{ translateX }, { translateY }, { scale }],
              }}
              pointerEvents={open ? 'auto' : 'none'}
            >
              <FastButton
                style={styles.iconBtn}
                onPress={() => handleNav(item.to)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={isActive ? '#ef4444' : '#ffffff'}
                />
                {item.to === 'Messages' && unreadMessages > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </Text>
                  </View>
                )}
              </FastButton>
            </Animated.View>
          );
        })}

        <Animated.View
          style={[
            styles.luButtonWrapper,
            { transform: [{ scale: luScale }, { rotate: luRotate }] },
            open && styles.luButtonOpen,
          ]}
          pointerEvents="auto"
        >
          <FastButton onPress={handleLuTap} style={styles.luButton}>
            <LULogo key={cycle} size={34} animate={false} />
          </FastButton>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SCREEN_W / 2,
    width: 0,
    height: 0,
    zIndex: 60,
  },
  iconBtn: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    zIndex: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  luButtonWrapper: {
    position: 'absolute',
    left: -BUTTON_SIZE / 2,
    top: -BUTTON_SIZE / 2,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  luButtonOpen: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  luButton: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
