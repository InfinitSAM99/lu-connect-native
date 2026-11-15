import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { PremiumAvatar } from '../components/PremiumBadge';

function SettingRow({ onClick, iconName, title, subtitle, danger, isLast, iconColor }: any) {
  return (
    <TouchableOpacity 
      style={[styles.row, !isLast && styles.rowBorder]} 
      onPress={onClick} 
      activeOpacity={0.6}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={20} color={danger ? '#ef4444' : (iconColor || '#fff')} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.rowTitle, danger && { color: '#ef4444' }]}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#3f3f3f" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const tier = profile?.subscription_tier || 'free';

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* PROFILE CARD */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile', { id: profile?.id })}
          activeOpacity={0.8}
        >
          <PremiumAvatar avatarUrl={profile?.avatar_url} fullName={profile?.full_name || 'User'} tier={tier as any} size={64} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
            </View>
            <Text style={styles.profileUni}>{profile?.university_name || 'Student'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6d7382" />
        </TouchableOpacity>

        {/* ACCOUNT */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.cardGroup}>
          <SettingRow onClick={() => navigation.navigate('AccountsCenter')} iconName="person-circle-outline" title="Accounts Center" subtitle="Password, personal details" />
          <SettingRow onClick={() => navigation.navigate('Security')} iconName="shield-checkmark-outline" title="Security Hub" subtitle="Pattern, questions, password" />
          <SettingRow onClick={() => navigation.navigate('LoginActivity')} iconName="desktop-outline" title="Login Activity" subtitle="Where you're logged in" />
          <SettingRow onClick={() => navigation.navigate('BlockedUsers')} iconName="ban-outline" title="Blocked Users" subtitle="Manage blocked accounts" isLast />
        </View>

        {/* PREFERENCES */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.cardGroup}>
          <SettingRow onClick={() => navigation.navigate('Preferences')} iconName="color-palette-outline" title="Appearance & Theme" subtitle="Dark mode, chat themes" />
          <SettingRow onClick={() => navigation.navigate('NotificationSettings')} iconName="notifications-outline" title="Notifications" subtitle="Messages, likes, follows" isLast />
        </View>

        {/* SUPPORT */}
        <Text style={styles.sectionHeader}>Support & More</Text>
        <View style={styles.cardGroup}>
          <SettingRow onClick={() => navigation.navigate('Announcements')} iconName="megaphone-outline" title="Announcements" subtitle="Campus-wide updates" />
          <SettingRow onClick={() => navigation.navigate('Events')} iconName="calendar-outline" title="Events" subtitle="What's happening on campus" />
          <SettingRow onClick={() => {}} iconName="help-circle-outline" title="Help Center" subtitle="Get support" isLast />
        </View>

        {/* LOGOUT */}
        <View style={[styles.cardGroup, { marginTop: 24 }]}>
          <TouchableOpacity style={styles.row} onPress={signOut} activeOpacity={0.6}>
            <View style={styles.iconWrap}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.rowTitle, { color: '#ef4444' }]}>Log out</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', color: '#3f3f3f', fontSize: 12, marginTop: 24, fontWeight: '600' }}>
          LU CONNECT v1.0.0
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginTop: 20, marginBottom: 8, backgroundColor: '#0a0a0a', borderRadius: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  profileUni: { color: '#6d7382', fontSize: 13 },

  sectionHeader: { color: '#6d7382', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  
  // The premium card look for grouped rows
  cardGroup: { backgroundColor: '#0a0a0a', borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#1f1f1f', overflow: 'hidden' },
  
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  iconWrap: { width: 32, alignItems: 'flex-start' },
  textWrap: { flex: 1 },
  rowTitle: { fontWeight: '600', fontSize: 15, color: '#fff' },
  rowSubtitle: { fontSize: 12, color: '#6d7382', marginTop: 2 },
});
