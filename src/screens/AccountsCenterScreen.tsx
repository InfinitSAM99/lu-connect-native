import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

function SectionHeader({ children, icon, color }: any) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.sectionHeaderText, { color }]}>{children}</Text>
      <View style={[styles.sectionLine, { backgroundColor: color }]} />
    </View>
  );
}

function PremiumRow({ onClick, iconName, title, color }: any) {
  return (
    <TouchableOpacity style={styles.row} onPress={onClick} activeOpacity={0.6}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color="#3f3f3f" />
    </TouchableOpacity>
  );
}

export default function AccountsCenterScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  if (!profile) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;
  const isPro = !!profile.professional_mode;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        hero
        title="Accounts Center"
        subtitle="Manage your account, security and professional tools"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={<Ionicons name="person-circle-outline" size={48} color="#ef4444" style={{ marginTop: 4 }} />}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        <SectionHeader icon="people-outline" color="#3b82f6">Your account</SectionHeader>
        <PremiumRow onClick={() => navigation.navigate('ProfileEdit')} iconName="person-outline" title="Personal Details" color="#3b82f6" />
        <PremiumRow onClick={() => navigation.navigate('ProfileEdit')} iconName="pencil" title="Profile Information" color="#eab308" />
        <PremiumRow onClick={() => navigation.navigate('ProfileEdit')} iconName="at" title="Username" color="#ef4444" />
        <PremiumRow onClick={() => navigation.navigate('Settings', { openPassword: true })} iconName="lock-closed" title="Password & Security" color="#22c55e" />
        <SectionHeader icon="briefcase-outline" color="#a855f7">Professional</SectionHeader>
        <PremiumRow onClick={() => navigation.navigate('ProfessionalMode')} iconName="rocket" title="Professional Mode" color="#a855f7" />
        {isPro && <PremiumRow onClick={() => navigation.navigate('ProfessionalDashboard')} iconName="bar-chart" title="Professional Dashboard" color="#f59e0b" />}
        <PremiumRow onClick={() => navigation.navigate('GetVerified')} iconName="shield-checkmark" title="Get verified faster" color="#06b6d4" />
        <PremiumRow onClick={() => navigation.navigate('GetBoosted')} iconName="flame" title="Boost eligibility" color="#ec4899" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  sectionHeaderWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, gap: 10 },
  sectionHeaderText: { fontSize: 15, fontWeight: '700' },
  sectionLine: { flex: 1, height: 1, opacity: 0.3, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowTitle: { flex: 1, fontWeight: '600', fontSize: 15, color: '#fff' },
});
