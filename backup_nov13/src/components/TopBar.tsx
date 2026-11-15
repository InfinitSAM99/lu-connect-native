import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TopBar({ 
  title, 
  subtitle,
  hero = false, 
  centeredHero = false, // NEW: Centers the icon and title
  showBack = false, 
  onBack, 
  rightComponent,
  centerIcon
}: any) {
  const insets = useSafeAreaInsets();

  // 1. CENTERED HERO (Like the Notifications Screenshot)
  if (centeredHero) {
    return (
      <View style={[styles.heroContainer, { paddingTop: Math.max(insets.top, 20), alignItems: 'center' }]}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={{ position: 'absolute', left: 20, top: Math.max(insets.top, 20) + 4, zIndex: 10 }}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
        )}
        
        {centerIcon && <View style={{ marginBottom: 16 }}>{centerIcon}</View>}
        
        <Text style={[styles.heroTitle, { textAlign: 'center' }]}>{title}</Text>
        {subtitle && <Text style={[styles.heroSubtitle, { textAlign: 'center' }]}>{subtitle}</Text>}
      </View>
    );
  }

  // 2. LEFT-ALIGNED HERO (For Dashboard, Settings, etc.)
  if (hero) {
    return (
      <View style={[styles.heroContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            {showBack && (
              <TouchableOpacity onPress={onBack} style={{ paddingTop: 6, marginLeft: -8 }}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{title}</Text>
              {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          {rightComponent && <View>{rightComponent}</View>}
        </View>
      </View>
    );
  }

  // 3. STANDARD TOP BAR
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {rightComponent ? rightComponent : <View style={styles.iconBtn} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Standard styles
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#0a0a0a' },
  left: { width: 40, alignItems: 'flex-start' },
  right: { width: 40, alignItems: 'flex-end' },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase' },
  iconBtn: { padding: 4 },

  // Hero styles
  heroContainer: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6d7382',
    lineHeight: 20,
  }
});
