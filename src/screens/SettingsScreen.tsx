import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

function FlatRow({ onClick, iconName, title, subtitle, danger }: any) {
  return (
    <TouchableOpacity style={styles.flatRow} onPress={onClick} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={22} color={danger ? '#ef4444' : '#6d7382'} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.flatRowTitle, danger && { color: '#ef4444' }]}>{title}</Text>
        {subtitle && <Text style={styles.flatRowSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
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
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.profileUni}>{profile?.university_name || 'Student'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6d7382" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* SECURITY */}
        <Text style={styles.sectionHeader}>SECURITY</Text>
        <FlatRow 
          onClick={() => navigation.navigate('Security')} 
          iconName="shield-checkmark-outline" 
          title="Security Hub" 
          subtitle="Pattern, questions, Account ID & password reset" 
        />
        <FlatRow onClick={() => navigation.navigate('AccountsCenter')} iconName="person-outline" title="Accounts Center" subtitle="Password, personal details & professional mode" />
        
        <View style={styles.divider} />

        {/* PREFERENCES */}
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <FlatRow onClick={() => navigation.navigate('Preferences')} iconName="color-palette-outline" title="Preferences" subtitle="Theme, vibration, notifications & sound" />
        
        <View style={styles.divider} />

        {/* SUPPORT */}
        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <FlatRow onClick={() => navigation.navigate('Announcements')} iconName="megaphone-outline" title="Announcements" subtitle="Campus-wide updates" />
        <FlatRow onClick={() => navigation.navigate('Events')} iconName="calendar-outline" title="Events" subtitle="What is happening on campus" />
        
        <View style={styles.divider} />

        {/* LOGOUT */}
        <TouchableOpacity style={styles.flatRow} onPress={signOut}>
          <View style={styles.iconWrap}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.flatRowTitle, { color: '#ef4444' }]}>Sign out</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.divider} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, marginHorizontal: 16, marginTop: 16, backgroundColor: '#0a0a0a', borderRadius: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#ef4444' },
  avatarPlaceholder: { backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#ef4444', fontSize: 24, fontWeight: '800' },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  profileUni: { color: '#6d7382', fontSize: 13 },
  
  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 16 },
  iconWrap: { width: 32, alignItems: 'center' },
  textWrap: { flex: 1 },
  flatRowTitle: { fontWeight: '500', fontSize: 15, color: '#fff' },
  flatRowSubtitle: { fontSize: 13, color: '#6d7382', marginTop: 2 },
  
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },
});
