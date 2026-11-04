import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

const SECTIONS = [
  {
    title: 'Discover',
    items: [
      { id: 'Search', label: 'Search', icon: 'search', color: '#3b82f6', desc: 'Find people & posts' },
      { id: 'AcademicHub', label: 'Academic Hub', icon: 'school', color: '#eab308', desc: 'Past papers, notes & more' },
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

  const handlePress = (item: any) => {
    if (item.id === 'Profile') {
      navigation.navigate('Profile', { id: profile?.id });
    } else if (item.params) {
      navigation.navigate(item.id, item.params);
    } else {
      navigation.navigate(item.id);
    }
  };

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

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 + insets.bottom }} 
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HERO */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { id: profile?.id })}
          style={styles.profileSection}
          activeOpacity={0.7}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.name} numberOfLines={1}>{profile?.full_name || 'Your Name'}</Text>
            <Text style={styles.uni} numberOfLines={1}>{profile?.university_name || 'LU Connect Student'}</Text>
            {notifications ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <Ionicons name="notifications" size={12} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>{notifications} new notifications</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
        </TouchableOpacity>

        {/* HALL OF FAME */}
        <TouchableOpacity
          onPress={() => navigation.navigate('HallOfFame')}
          style={styles.hallOfFameSection}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="trophy" size={32} color="#E5C07B" />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ color: '#E5C07B', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>THE LURIES 2026</Text>
            <Text style={styles.sectionTitleText}>Hall of Fame</Text>
            <Text style={styles.sectionDesc}>See the top students of the year</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
        </TouchableOpacity>

        {/* ADMIN (Only for adminsammy) */}
        {profile?.email === 'adminsammy@admin.com' && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminDashboard')}
            style={styles.adminSection}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Ionicons name="shield-half" size={28} color="#ef4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.sectionTitleText}>Admin Hub</Text>
              <Text style={styles.sectionDesc}>Manage community, verifications, and requests.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
          </TouchableOpacity>
        )}

        {/* SECTIONS */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ marginTop: 32 }}>
            <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
            
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handlePress(item)}
                style={styles.rowItem}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: 'transparent' }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
              </TouchableOpacity>
            ))}
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#ef4444' },
  avatarPlaceholder: { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#ef4444', fontSize: 24, fontWeight: '800' },
  name: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  uni: { color: '#6d7382', fontSize: 13 },

  hallOfFameSection: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginTop: 8,
  },
  adminSection: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginTop: 8,
  },
  
  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 16 },
  
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  iconWrap: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  rowDesc: { color: '#6d7382', fontSize: 13 },
  
  sectionTitleText: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sectionDesc: { color: '#6d7382', fontSize: 13 },
});
