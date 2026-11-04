import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EXTRA_MODULES = [
  { title: 'Dashboard', desc: 'Stats, charts, and live activity.', icon: 'stats-chart', color: '#ef4444', route: 'AdminDashboard' },
  { title: 'Tunnels', desc: 'Secret admin-only invite links.', icon: 'lock-closed', color: '#f43f5e', route: 'Tunnels' },
  { title: 'Students', desc: 'Manage all users', icon: 'people', color: '#3b82f6', route: 'AdminStudents' },
  { title: 'Security Center', desc: 'Monitor hacking attempts.', icon: 'shield', color: '#ef4444', route: 'AdminSecurity' },
  { title: 'Moderation', desc: 'Review AI-flagged content.', icon: 'shield-checkmark', color: '#ef4444', route: 'AdminModeration' },
  { title: 'Payments', desc: 'Approve mobile money transactions.', icon: 'card', color: '#22c55e', route: 'AdminPayments' },
  { title: 'Events', desc: 'Manage campus events and dates.', icon: 'calendar', color: '#8b5cf6', route: 'AdminEvents' },
  { title: 'Groups', desc: 'Manage community groups.', icon: 'people-circle', color: '#ec4899', route: 'AdminGroups' },
  { title: 'Announcements', desc: 'Post campus-wide updates.', icon: 'megaphone', color: '#f97316', route: 'AdminAnnouncements' },
  { title: 'Posts', desc: 'View and manage all feed posts.', icon: 'document-text', color: '#22c55e', route: 'AdminPosts' },
  { title: 'Comments', desc: 'Review flagged comments.', icon: 'chatbubble-ellipses', color: '#0ea5e9', route: 'AdminComments' },
  { title: 'Admins', desc: 'Manage admin roles and permissions.', icon: 'key', color: '#eab308', route: 'AdminAdmins' },
  { title: 'Audit Logs', desc: 'View all admin actions.', icon: 'list', color: '#6d7382', route: 'AdminAuditLogs' },
  { title: 'Settings', desc: 'App configuration and maintenance.', icon: 'settings', color: '#6d7382', route: 'AdminSettings' },
];

export default function AdminMenuScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.heroContent}>
          <Ionicons name="shield-half" size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Admin Menu</Text>
          <Text style={styles.heroSub}>Access all management tools and configurations.</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 20 }} 
        showsVerticalScrollIndicator={false}
      >
        {EXTRA_MODULES.map((mod) => (
          <TouchableOpacity 
            key={mod.route} 
            style={styles.menuItem} 
            onPress={() => navigation.navigate(mod.route)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={mod.icon as any} size={26} color={mod.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{mod.title}</Text>
              <Text style={styles.menuDesc}>{mod.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
          </TouchableOpacity>
        ))}

        {/* EXIT ADMIN */}
        <TouchableOpacity 
          style={[styles.menuItem, { marginTop: 30 }]} 
          onPress={() => navigation.navigate('Feed')}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="exit" size={26} color="#ef4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: '#ef4444' }]}>Exit Admin</Text>
            <Text style={styles.menuDesc}>Return to the student app.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  hero: { paddingHorizontal: 16, paddingBottom: 24, backgroundColor: '#000' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent: { alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  heroSub: { color: '#6d7382', fontSize: 13, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  
  // Spacing instead of dividers
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
  iconWrap: { width: 40, alignItems: 'flex-start' },
  menuTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  menuDesc: { color: '#6d7382', fontSize: 13, lineHeight: 18 },
});
