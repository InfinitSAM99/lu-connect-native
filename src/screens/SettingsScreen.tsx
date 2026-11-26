import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

function SettingRow({ onClick, iconName, title }: any) {
  return (
    <TouchableOpacity style={styles.row} onPress={onClick} activeOpacity={0.6}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={26} color="#fff" />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={22} color="#6d7382" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* INFINIT LOGO HERO */}
        <View style={styles.hero}>
          <Image 
            source={require('../../assets/images/infinit_logo.png')} 
            style={styles.infinitLogo} 
          />
          <Text style={styles.brandText}>INFINIT CO ACCOUNT</Text>
        </View>

        <View style={styles.listContainer}>
          
          {/* PROFILE ROW */}
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => navigation.navigate('Profile')} 
            activeOpacity={0.6}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="person-circle-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.rowTitle}>Profile</Text>
            <Ionicons name="chevron-forward" size={22} color="#6d7382" />
          </TouchableOpacity>

          <SettingRow onClick={() => navigation.navigate('AccountsCenter')} iconName="person-outline" title="Account Center" />
          <SettingRow onClick={() => navigation.navigate('Privacy')} iconName="shield-outline" title="Privacy & App Lock" />
          <SettingRow onClick={() => navigation.navigate('LoginActivity')} iconName="log-in-outline" title="Login Activity" />
          <SettingRow onClick={() => navigation.navigate('BlockedUsers')} iconName="ban-outline" title="Blocked Users" />
          <SettingRow onClick={() => navigation.navigate('Preferences')} iconName="color-palette-outline" title="Appearance & Theme" />
          <SettingRow onClick={() => navigation.navigate('NavigationStyle')} iconName="apps-outline" title="Navigation Style" />
          <SettingRow onClick={() => navigation.navigate('NotificationSettings')} iconName="notifications-outline" title="Notifications" />
          <SettingRow onClick={() => navigation.navigate('Announcements')} iconName="megaphone-outline" title="Announcements" />
          <SettingRow onClick={() => navigation.navigate('Events')} iconName="calendar-outline" title="Events" />
          <SettingRow onClick={() => navigation.navigate('ContactAdmin')} iconName="help-circle-outline" title="Help Center" />

          {/* LOGOUT */}
          <TouchableOpacity style={styles.row} onPress={signOut} activeOpacity={0.6}>
            <View style={styles.iconWrap}>
              <Ionicons name="log-out-outline" size={26} color="#ef4444" />
            </View>
            <Text style={[styles.rowTitle, { color: '#ef4444' }]}>Log out</Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.footerText}>LU CONNECT v2.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, // Pure black
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  hero: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  infinitLogo: { width: 180, height: 60, resizeMode: 'contain', marginBottom: 4 },
  brandText: { color: '#6d7382', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  listContainer: { paddingHorizontal: 24, paddingTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 22 },
  iconWrap: { width: 40, marginRight: 20, alignItems: 'flex-start', justifyContent: 'center' },
  rowTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' },
  footerText: { textAlign: 'center', color: '#3f3f3f', fontSize: 12, marginTop: 40, fontWeight: '600', letterSpacing: 1 }
});
