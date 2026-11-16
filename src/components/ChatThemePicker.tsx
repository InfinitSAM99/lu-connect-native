import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import AppButton from './AppButton';
import { THEMES } from '../lib/chatThemes';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function ChatThemePicker({ open, current, onSelect, onClose }: { open: boolean, current: string, onSelect: (id: string) => void, onClose: () => void }) {
  const { profile } = useAuth();
  const isPremiumUser = profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'elite';
  const themeList = Object.values(THEMES);

  const handleSelect = (theme: any) => {
    if (theme.isPremium && !isPremiumUser) {
      Toast.show({ type: 'info', text1: 'Premium Required', text2: 'Upgrade to LU Pro to use this theme.' });
      return;
    }
    onSelect(theme.id);
  };

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="60vh">
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="color-palette" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Chat Theme</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 20 }}>
          {themeList.map((t: any) => {
            const isActive = current === t.id;
            const isLocked = t.isPremium && !isPremiumUser;

            return (
              <AppButton key={t.id} onPress={() => handleSelect(t)} style={{ alignItems: 'center' }}>
                <View style={[styles.previewContainer, isActive && { borderColor: '#FFD700', borderWidth: 3 }]}>
                  
                  {/* 1. Background Image or Color */}
                  {t.image ? (
                    <Image source={t.image} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} />
                  )}

                  {/* 2. Lock Overlay */}
                  {isLocked && (
                    <View style={[StyleSheet.absoluteFillObject, styles.lockOverlay]}>
                      <Ionicons name="lock-closed" size={24} color="#FFD700" />
                    </View>
                  )}

                  {/* 3. Demo Bubbles */}
                  <View style={[styles.demoBubble, { backgroundColor: 'rgba(0,0,0,0.6)', alignSelf: 'flex-start' }]}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>Hi!</Text>
                  </View>
                  <View style={[styles.demoBubble, { backgroundColor: '#ef4444', alignSelf: 'flex-end', marginTop: 8 }]}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>Hello</Text>
                  </View>

                  {/* 4. Active Checkmark */}
                  {isActive && (
                    <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#fff', borderRadius: 12 }}>
                      <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
                    </View>
                  )}
                </View>
                <Text style={{ color: isActive ? '#FFD700' : (isLocked ? '#6d7382' : '#aab0bd'), fontSize: 13, fontWeight: isActive ? '700' : '500', marginTop: 8 }}>
                  {t.name}
                </Text>
              </AppButton>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 10,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: '#141414',
  },
  lockOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBubble: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 80,
  }
});
