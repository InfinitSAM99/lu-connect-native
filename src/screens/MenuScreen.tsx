import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

const { width: SCREEN_W } = Dimensions.get('window');

const MENU_ITEMS = [
  { id: 'Search',         label: 'Search',         icon: 'search',         color: '#3b82f6', desc: 'Find people and posts' },
  { id: 'AIAssistant',    label: 'AI Assistant',   icon: 'sparkles',       color: '#a855f7', desc: 'Ask anything' },
  { id: 'Marketplace',    label: 'Marketplace',    icon: 'cart',           color: '#06b6d4', desc: 'Buy & sell on campus' },
  { id: 'Feed',           label: 'Confessions',    icon: 'eye-off',        color: '#6366f1', desc: 'Post anonymously', params: { openComposer: true, anonymous: true } },
  { id: 'Events',         label: 'Events',         icon: 'calendar',       color: '#8b5cf6', desc: 'Campus events' },
  { id: 'Groups',         label: 'Groups',         icon: 'people-circle',  color: '#ec4899', desc: 'Join communities' },
  { id: 'Announcements',  label: 'Announcements',  icon: 'megaphone',      color: '#f97316', desc: 'Campus updates' },
  { id: 'Saved',          label: 'Saved',          icon: 'bookmark',       color: '#22c55e', desc: 'Your bookmarks' },
  { id: 'Video',          label: 'Video',          icon: 'videocam',       color: '#f43f5e', desc: 'Watch & discover' },
  { id: 'Settings',       label: 'Settings',       icon: 'settings',       color: '#6d7382', desc: 'App preferences' },
];

export default function MenuScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const CARD_W = (SCREEN_W - 16 * 2 - 12) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        hero
        title="Menu"
        subtitle="Everything LU CONNECT has to offer"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={<Ionicons name="menu" size={48} color="#ef4444" style={{ marginTop: 4 }} />}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MENU_ITEMS.map((item) => (
            <FastButton
              key={item.id}
              style={[styles.card, { width: CARD_W }]}
              onPress={() => navigation.navigate(item.id, item.params || {})}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon as any} size={26} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </FastButton>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    gap: 8,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#6d7382',
    fontSize: 12,
    lineHeight: 16,
  },
});
