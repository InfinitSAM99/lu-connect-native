import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import AppButton from './AppButton';
import { THEMES } from '../lib/chatThemes';

export default function ChatThemePicker({ open, current, onSelect, onClose }: { open: boolean, current: string, onSelect: (id: string) => void, onClose: () => void }) {
  const themeList = Object.values(THEMES);

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="60vh">
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="color-palette" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Chat Theme</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 20 }}>
          {themeList.map((t) => {
            const isActive = current === t.id;
            
            return (
              <AppButton key={t.id} onPress={() => onSelect(t.id)} style={{ alignItems: 'center' }}>
                <View style={[styles.previewContainer, isActive && { borderColor: t.myBubble, borderWidth: 3 }]}>
                  {t.isGradient ? (
                    <LinearGradient colors={t.colors as any} style={StyleSheet.absoluteFillObject} />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.bg }]} />
                  )}
                  
                  <View style={[styles.demoBubble, { backgroundColor: t.theirBubble, alignSelf: 'flex-start' }]}>
                     <Text style={{ color: t.text, fontSize: 10, opacity: 0.8 }}>Hi!</Text>
                  </View>
                  <View style={[styles.demoBubble, { backgroundColor: t.myBubble, alignSelf: 'flex-end', marginTop: 8 }]}>
                    <Text style={{ color: t.text === '#000000' ? '#fff' : '#fff', fontSize: 10 }}>Hello</Text>
                  </View>

                  {isActive && (
                    <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#fff', borderRadius: 12 }}>
                      <Ionicons name="checkmark-circle" size={24} color={t.myBubble} />
                    </View>
                  )}
                </View>
                <Text style={{ color: isActive ? t.myBubble : '#aab0bd', fontSize: 13, fontWeight: isActive ? '700' : '500', marginTop: 8 }}>
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
  },
  demoBubble: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 80,
  }
});
