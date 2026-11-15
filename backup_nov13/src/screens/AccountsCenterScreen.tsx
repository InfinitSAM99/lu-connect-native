import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

function SectionHeader({ children }: any) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

function PremiumRow({ onClick, iconName, title, iconColor }: any) {
  return (
    <TouchableOpacity 
      style={styles.row} 
      onPress={onClick} 
      activeOpacity={0.6}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
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
        
        <SectionHeader>Your account</SectionHeader>
        <PremiumRow 
          onClick={() => navigation.navigate('ProfileEdit')} 
          iconName="person-outline" 
          title="Personal Details" 
          iconColor="#3b82f6" 
        />
        <PremiumRow 
          onClick={() => navigation.navigate('ProfileEdit')} 
          iconName="pencil" 
          title="Profile Information" 
          iconColor="#eab308" 
        />
        <PremiumRow 
          onClick={() => navigation.navigate('ProfileEdit')} 
          iconName="at" 
          title="Username" 
          iconColor="#ef4444" 
        />
        <PremiumRow 
          onClick={() => navigation.navigate('Settings', { openPassword: true })} 
          iconName="lock-closed" 
          title="Password & Security" 
          iconColor="#22c55e" 
        />

        <SectionHeader>Professional</SectionHeader>
        <PremiumRow 
          onClick={() => navigation.navigate('ProfessionalMode')} 
          iconName="rocket" 
          title="Professional Mode" 
          iconColor="#8b5cf6" 
        />
        {isPro && (
          <PremiumRow 
            onClick={() => navigation.navigate('ProfessionalDashboard')} 
            iconName="star" 
            title="Professional Dashboard" 
            iconColor="#f59e0b" 
          />
        )}
        <PremiumRow 
          onClick={() => navigation.navigate('GetVerified')} 
          iconName="shield-checkmark" 
          title="Get verified faster" 
          iconColor="#06b6d4" 
        />
        <PremiumRow 
          onClick={() => navigation.navigate('GetBoosted')} 
          iconName="flame" 
          title="Boost eligibility" 
          iconColor="#ec4899" 
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { color: '#6d7382', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowTitle: { fontWeight: '600', fontSize: 15, color: '#fff' },
});
