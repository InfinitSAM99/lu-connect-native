import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

const SECTIONS = [
  {
    title: 'Discover',
    items: [
      { id: 'Search', label: 'Search', icon: 'search', color: '#3b82f6', desc: 'Find people & posts' },
      { id: 'AIAssistant', label: 'AI Assistant', icon: 'sparkles', color: '#a855f7', desc: 'Ask anything' },
      { id: 'Marketplace', label: 'Marketplace', icon: 'cart', color: '#06b6d4', desc: 'Buy & sell on campus' },
      { id: 'Video', label: 'Reels', icon: 'videocam', color: '#f43f5e', desc: 'Watch & discover' },
    ],
  },
  {
    title: 'Social',
    items: [
      { id: 'Events', label: 'Events', icon: 'calendar', color: '#8b5cf6', desc: 'Campus events' },
      { id: 'Groups', label: 'Groups', icon: 'people-circle', color: '#ec4899', desc: 'Join communities' },
      { id: 'Feed', label: 'Confessions', icon: 'eye-off', color: '#6366f1', desc: 'Post anonymously', params: { openComposer: true, anonymous: true } },
      { id: 'Connections', label: 'Connections', icon: 'people', color: '#0ea5e9', desc: 'Grow your network' },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'Announcements', label: 'Announcements', icon: 'megaphone', color: '#f97316', desc: 'Campus updates' },
      { id: 'Saved', label: 'Saved', icon: 'bookmark', color: '#22c55e', desc: 'Your bookmarks' },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'Settings', label: 'Settings', icon: 'settings', color: '#6d7382', desc: 'App preferences' },
    ],
  },
];

export default function MenuScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const CARD_W = (SCREEN_W - 16 * 2 - 12) / 2;

  // Live unread counts
  const { data: notifications } = useQuery({
    queryKey: ['menu-notifs', profile?.id],
    enabled: !!profile?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile!.id).eq('is_read', false);
      return count || 0;
    },
  });

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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>

        {/* PROFILE HERO CARD */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { id: profile?.id })}
          style={styles.heroCard}
          activeOpacity={0.85}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.heroAvatar} />
          ) : (
            <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder]}>
              <Text style={styles.heroInitial}>{profile?.full_name?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName} numberOfLines={1}>{profile?.full_name || 'Your Name'}</Text>
            <Text style={styles.heroUni} numberOfLines={1}>{profile?.university_name || 'LU Connect Student'}</Text>
            <View style={styles.heroStats}>
              {notifications ? (
                <View style={styles.heroStatItem}>
                  <Ionicons name="notifications" size={11} color="#ef4444" />
                  <Text style={styles.heroStatText}>{notifications} new</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#6d7382" />
        </TouchableOpacity>

        {/* HALL OF FAME HIGHLIGHT CARD */}
        <TouchableOpacity
          onPress={() => navigation.navigate('HallOfFame')}
          style={styles.featuredCard}
          activeOpacity={0.9}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="trophy" size={14} color="#E5C07B" />
              <Text style={styles.featuredTag}>THE LURIES 2026</Text>
            </View>
            <Text style={styles.featuredTitle}>Hall of Fame</Text>
            <Text style={styles.featuredSubtitle}>See the top students of the year</Text>
          </View>
          <View style={styles.featuredIcon}>
            <Ionicons name="trophy" size={32} color="#E5C07B" />
          </View>
        </TouchableOpacity>

        {/* SECTIONS */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {section.items.map((item) => (
                <FastButton
                  key={item.id}
                  style={[styles.card, { width: CARD_W }]}
                  onPress={() => navigation.navigate(item.id, item.params || {})}
                >
                  <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
                </FastButton>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>LU CONNECT · Kenya · 2026</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  heroAvatar: { width: 60, height: 60, borderRadius: 30 },
  heroAvatarPlaceholder: { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  heroInitial: { color: '#ef4444', fontSize: 26, fontWeight: '800' },
  heroName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroUni: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 8 },
  heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { color: '#ef4444', fontSize: 11, fontWeight: '600' },

  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0F1A',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 18,
    padding: 20,
    gap: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  featuredTag: { color: '#E5C07B', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  featuredTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  featuredSubtitle: { color: '#8892A4', fontSize: 12, marginTop: 4 },
  featuredIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(229,192,123,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(229,192,123,0.3)' },

  sectionTitle: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },

  card: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardDesc: { color: '#6d7382', fontSize: 12, lineHeight: 16 },

  footer: { color: '#3b1215', fontSize: 11, letterSpacing: 2, fontWeight: '600', textAlign: 'center', marginTop: 40 },
});
