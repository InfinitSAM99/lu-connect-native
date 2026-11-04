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

// Top 5 important items for the radial
const ADMIN_NAV_ITEMS = [
  { to: 'AdminMessages',  label: 'Messages',  icon: 'chatbubbles' },
  { to: 'AdminPending',   label: 'Approvals', icon: 'person-add' },
  { to: 'AdminReports',   label: 'Reports',   icon: 'flag' },
  { to: 'AdminPayments',  label: 'Payments',  icon: 'card' },
  { to: 'AdminMenu',      label: 'Menu',      icon: 'menu' }, // Triggers drawer
];

const positions = ADMIN_NAV_ITEMS.map((_, i) => {
  const t = i / (ADMIN_NAV_ITEMS.length - 1);
  const angle = Math.PI - t * Math.PI;
  return {
    x: Math.cos(angle) * RADIUS,
    y: -Math.sin(angle) * RADIUS,
  };
});

// The rest of the modules in the drawer
const EXTRA_MODULES = [
  { title: 'Dashboard', desc: 'Stats, charts, and live activity.', icon: 'stats-chart', color: '#ef4444', route: 'AdminDashboard' },
  { title: 'Events', desc: 'Manage campus events and dates.', icon: 'calendar', color: '#8b5cf6', route: 'AdminEvents' },
  { title: 'Groups', desc: 'Manage community groups.', icon: 'people-circle', color: '#ec4899', route: 'AdminGroups' },
  { title: 'Announcements', desc: 'Post campus-wide updates.', icon: 'megaphone', color: '#f97316', route: 'AdminAnnouncements' },
  { title: 'Posts', desc: 'View and manage all feed posts.', icon: 'document-text', color: '#22c55e', route: 'AdminPosts' },
  { title: 'Comments', desc: 'Review flagged comments.', icon: 'chatbubble-ellipses', color: '#0ea5e9', route: 'AdminComments' },
  { title: 'Admins', desc: 'Manage admin roles and permissions.', icon: 'key', color: '#eab308', route: 'AdminAdmins' },
  { title: 'Audit Logs', desc: 'View all admin actions.', icon: 'list', color: '#6d7382', route: 'AdminAuditLogs' },
  { title: 'Settings', desc: 'App configuration and maintenance.', icon: 'settings', color: '#6d7382', route: 'AdminSettings' },
];

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

  const handleExtraNav = (route: string) => {
    setShowMenu(false);
    if (routeName !== route) {
      navigation.navigate(route);
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
                pointerEvents: open ? 'auto' : 'none',
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: '50%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 12 },
  drawerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', gap: 16 },
  menuIconWrap: { width: 32, alignItems: 'flex-start' },
  menuTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  menuDesc: { color: '#6d7382', fontSize: 12, lineHeight: 16 },
});
