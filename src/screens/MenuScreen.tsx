import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { PremiumAvatar, PremiumDiamond } from '../components/PremiumBadge';
import TopBar from '../components/TopBar';

const SECTIONS = [
  {
    title: 'Social',
    items: [
      { id: 'Connections', label: 'Connections', icon: 'people', color: '#3b82f6', desc: 'See your friends & network' },
      { id: 'Messages', label: 'Messages', icon: 'chatbubbles', color: '#22c55e', desc: 'Your private conversations' },
      { id: 'Events', label: 'Events', icon: 'calendar', color: '#f59e0b', desc: 'Campus happenings' },
      { id: 'Groups', label: 'Groups', icon: 'people-circle', color: '#8b5cf6', desc: 'Communities & societies' },
      { id: 'Confessions', label: 'Confessions', icon: 'eye-off', color: '#ec4899', desc: 'Anonymous campus secrets' },
    ],
  },
  {
    title: 'Discover',
    items: [
      { id: 'Search', label: 'Search', icon: 'search', color: '#3b82f6', desc: 'Find people & posts' },
      { id: 'AcademicHub', label: 'Academic Hub', icon: 'school', color: '#f59e0b', desc: 'Past papers, notes & more' },
      { id: 'AIAssistant', label: 'AI Assistant', icon: 'sparkles', color: '#8b5cf6', desc: 'Ask anything' },
      { id: 'Marketplace', label: 'Marketplace', icon: 'cart', color: '#06b6d4', desc: 'Buy & sell on campus' },
      { id: 'Video', label: 'Reels', icon: 'videocam', color: '#ef4444', desc: 'Watch & discover' },
    ],
  },
  {
    title: 'Professional',
    items: [
      { id: 'ProfessionalMode', label: 'Professional Mode', icon: 'rocket', color: '#a855f7', desc: 'Elevate your profile' },
      { id: 'ProfessionalDashboard', label: 'Professional Dashboard', icon: 'bar-chart', color: '#f59e0b', desc: 'See your analytics' },
      { id: 'GetVerified', label: 'Get Verified', icon: 'shield-checkmark', color: '#06b6d4', desc: 'Verify your identity faster' },
      { id: 'GetBoosted', label: 'Get Boosted', icon: 'flame', color: '#ec4899', desc: 'Boost your profile visibility' },
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
      { id: 'SubscriptionScreen', label: 'Subscription', icon: 'diamond', color: '#FFD700', desc: 'Manage your LU Pro plan' },
      { id: 'PaymentMethodsScreen', label: 'Payment Page', icon: 'card', color: '#22c55e', desc: 'Link M-Pesa & Airtel' },
      { id: 'Settings', label: 'Settings', icon: 'settings', color: '#6d7382', desc: 'App preferences' },
    ],
  },
];

export default function MenuScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

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
          <PremiumAvatar
            avatarUrl={profile?.avatar_url}
            fullName={profile?.full_name}
            tier={profile?.subscription_tier || 'free'}
            size={72}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{profile?.full_name || 'User'}</Text>
              <PremiumDiamond tier={profile?.subscription_tier || 'free'} />
            </View>
            <Text style={{ color: '#6d7382', fontSize: 14, marginTop: 2 }}>{profile?.university_name || 'Student'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="notifications" size={14} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>1 new notification</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#6d7382" />
        </TouchableOpacity>

        {/* HALL OF FAME */}
        <TouchableOpacity
          style={styles.hallOfFame}
          onPress={() => navigation.navigate('HallOfFame')}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy" size={32} color="#f59e0b" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>THE LURIES 2026</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 }}>Hall of Fame</Text>
            <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 2 }}>See the top students of the year</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#6d7382" />
        </TouchableOpacity>

        {/* LU PRO BANNER */}
        <TouchableOpacity
          style={styles.luProBanner}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SubscriptionScreen')}
        >
          <LinearGradient
            colors={['rgba(255,215,0,0.15)', 'rgba(20,20,20,1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.luProGradient}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="diamond" size={24} color="#FFD700" />
                  <Text style={styles.luProTitle}>LU Pro</Text>
                </View>
                <Text style={styles.luProDesc}>Unlock custom icons, themes & more.</Text>
              </View>
              <LinearGradient
                colors={['#FFDF00', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.luProBtn}
              >
                <Text style={styles.luProBtnText}>Upgrade</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* SECTIONS */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ marginTop: 32 }}>
            <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 2 }}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6d7382" />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  hallOfFame: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', padding: 16, borderRadius: 16, marginTop: 24, borderWidth: 1, borderColor: '#1f1f1f' },
  luProBanner: { marginTop: 20, marginBottom: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  luProGradient: { padding: 16 },
  luProTitle: { color: '#FFD700', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  luProDesc: { color: '#a1a1aa', fontSize: 12, marginTop: 4, marginLeft: 32 },
  luProBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  luProBtnText: { color: '#000', fontSize: 13, fontWeight: '900' },
  sectionHeader: { color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
