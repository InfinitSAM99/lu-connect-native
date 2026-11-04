import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminApprovalsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const modules = [
    { 
      section: 'URGENT', 
      items: [
        { id: 'messages', title: 'Recovery Messages', desc: 'Verify banned users and send Account IDs.', icon: 'chatbubbles', color: '#ef4444', route: 'AdminMessages' },
        { id: 'pending', title: 'Pending Approvals', desc: 'Approve new student registrations.', icon: 'person-add', color: '#3b82f6', route: 'AdminPending' },
        { id: 'appeals', title: 'Appeals', desc: 'Review banned user identity appeals.', icon: 'shield-checkmark', color: '#8b5cf6', route: 'AdminAppeals' },
      ]
    },
    {
      section: 'FINANCE',
      items: [
        { id: 'payments', title: 'Payments', desc: 'Approve mobile money transactions.', icon: 'card', color: '#22c55e', route: 'AdminPayments' },
        { id: 'boosts', title: 'Boosts', desc: 'Manage promoted posts and followers.', icon: 'rocket', color: '#f97316', route: 'AdminBoosts' },
      ]
    },
    {
      section: 'MODERATION',
      items: [
        { id: 'reports', title: 'Reports', desc: 'Review reported posts and users.', icon: 'flag', color: '#ef4444', route: 'AdminReports' },
        { id: 'moderation', title: 'Moderation', desc: 'Delete inappropriate content.', icon: 'trash', color: '#6d7382', route: 'AdminModeration' },
        { id: 'comments', title: 'Comments', desc: 'Review flagged comments.', icon: 'chatbubble-ellipses', color: '#0ea5e9', route: 'AdminComments' },
      ]
    },
    {
      section: 'COMMUNITY',
      items: [
        { id: 'students', title: 'Students', desc: 'View and manage all registered users.', icon: 'people', color: '#3b82f6', route: 'AdminStudents' },
        { id: 'events', title: 'Events', desc: 'Manage campus events and dates.', icon: 'calendar', color: '#8b5cf6', route: 'AdminEvents' },
        { id: 'groups', title: 'Groups', desc: 'Manage community groups.', icon: 'people-circle', color: '#ec4899', route: 'AdminGroups' },
        { id: 'announcements', title: 'Announcements', desc: 'Post campus-wide updates.', icon: 'megaphone', color: '#f97316', route: 'AdminAnnouncements' },
        { id: 'posts', title: 'Posts', desc: 'View and manage all feed posts.', icon: 'document-text', color: '#22c55e', route: 'AdminPosts' },
      ]
    },
    {
      section: 'SYSTEM',
      items: [
        { id: 'admins', title: 'Admins', desc: 'Manage admin roles and permissions.', icon: 'key', color: '#eab308', route: 'AdminAdmins' },
        { id: 'audit', title: 'Audit Logs', desc: 'View all admin actions.', icon: 'list', color: '#6d7382', route: 'AdminAuditLogs' },
        { id: 'settings', title: 'Settings', desc: 'App configuration and maintenance.', icon: 'settings', color: '#6d7382', route: 'AdminSettings' },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.heroContent}>
          <Ionicons name="shield-half" size={56} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.heroTitle}>Admin</Text>
          <Text style={styles.heroSub}>Manage LU Connect community, verifications, and requests.</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {modules.map((section, idx) => (
          <View key={idx}>
            <Text style={styles.sectionHeader}>{section.section}</Text>
            {section.items.map((mod) => (
              <TouchableOpacity 
                key={mod.id} 
                style={styles.row} 
                onPress={() => {
                  if (mod.route === 'AdminMessages' || mod.route === 'AdminPending') {
                    navigation.navigate(mod.route);
                  } else {
                    // Placeholder for future native pages
                    console.log('Navigate to', mod.route);
                  }
                }} 
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={mod.icon as any} size={26} color={mod.color} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.rowTitle}>{mod.title}</Text>
                  <Text style={styles.rowDesc}>{mod.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
              </TouchableOpacity>
            ))}
            <View style={styles.divider} />
          </View>
        ))}
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
  
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },
  sectionHeader: { 
    color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, 
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 
  },
  
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16 },
  iconWrap: { width: 40, alignItems: 'flex-start' },
  textWrap: { flex: 1, paddingRight: 16 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  rowDesc: { color: '#6d7382', fontSize: 13, lineHeight: 18 },
});
