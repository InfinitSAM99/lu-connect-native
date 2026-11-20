import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import LULogo from './LULogo';
import FastButton from './FastButton';

const { width: SCREEN_W } = Dimensions.get('window');

const RADIUS = 70;
const BUTTON_SIZE = 50;
const ICON_SIZE = 36;
const CYCLE_MS = 4400;

const ADMIN_NAV_ITEMS = [
  { to: 'AdminMessages',  label: 'Messages',  icon: 'chatbubbles' },
  { to: 'AdminPending',   label: 'Approvals', icon: 'person-add' },
  { to: 'AdminReports',   label: 'Reports',   icon: 'flag' },
  { to: 'AdminPayments',  label: 'Payments',  icon: 'card' },
  { to: 'AdminMenu',      label: 'Menu',      icon: 'menu' },
];

const positions = ADMIN_NAV_ITEMS.map((_, i) => {
  const t = i / (ADMIN_NAV_ITEMS.length - 1);
  const angle = Math.PI - t * Math.PI;
  return {
    x: Math.cos(angle) * RADIUS,
    y: -Math.sin(angle) * RADIUS,
  };
});

export default function AdminRadialNav() {
  const navigation = useNavigation();
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState(0);

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

  const handleNav = (item: any) => {
    closeMenu();
    if (routeName !== item.to) {
      navigation.navigate(item.to);
    }
  };

  const handleLuTap = () => {
    if (open) {
      closeMenu();
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
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 45 }]}
          onPress={closeMenu}
        >
          <View style={StyleSheet.absoluteFill} />
        </FastButton>
      )}

      <View
        style={[styles.wrapper, { bottom: (Platform.OS === 'ios' ? 34 : 24) + 20 }]}
        pointerEvents="box-none"
      >
        {ADMIN_NAV_ITEMS.map((item, i) => {
          const { x, y } = positions[i];
          const isActive = routeName === item.to;

          const translateX = openAnim.interpolate({ inputRange: [0, 1], outputRange: [0, x] });
          const translateY = openAnim.interpolate({ inputRange: [0, 1], outputRange: [0, y] });
          const scale = openAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

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
              <FastButton style={styles.iconBtn} onPress={() => handleNav(item)}>
                <Ionicons name={item.icon as any} size={18} color={isActive ? '#ef4444' : '#ffffff'} />
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
  wrapper: { position: 'absolute', left: SCREEN_W / 2, width: 0, height: 0, zIndex: 60 },
  iconBtn: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  luButtonWrapper: {
    position: 'absolute', left: -BUTTON_SIZE / 2, top: -BUTTON_SIZE / 2, width: BUTTON_SIZE, height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2, borderWidth: 2, borderColor: '#ffffff', backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center', zIndex: 2, elevation: 6,
  },
  luButtonOpen: { borderColor: '#ef4444', shadowColor: '#ef4444', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  luButton: { flex: 1, width: '100%', height: '100%', borderRadius: BUTTON_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
});
