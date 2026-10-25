import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

function SectionHeader({ children }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

export default function AccountsCenterScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  if (!profile) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;

  const isPro = !!profile.professional_mode;

  const goToSettings = (sheetName: string) => {
    navigation.navigate('Settings', { edit: sheetName });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      
      {/* HERO TOP BAR WITH BACK BUTTON AND BIG ICON */}
      <TopBar 
        hero
        title="Accounts Center" 
        subtitle="Manage your account, security and professional tools"
        showBack={true} 
        onBack={() => navigation.goBack()} 
        rightComponent={
          <Ionicons name="person-circle-outline" size={48} color="#ef4444" style={{ marginTop: 4 }} />
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        
        <SectionHeader>Your account</SectionHeader>
        
        <TouchableOpacity style={styles.flatRow} onPress={() => goToSettings('personal')}>
          <Ionicons name="person-outline" size={22} color="#fff" style={{ width: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>Personal Details</Text>
            <Text style={styles.flatRowSubtitle}>{profile.email} · {profile.is_verified ? 'Verified' : 'Not verified'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.flatRow} onPress={() => goToSettings('profile')}>
          <Ionicons name="pencil" size={22} color="#fff" style={{ width: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>Profile Information</Text>
            <Text style={styles.flatRowSubtitle}>Bio, faculty, course, year & more</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.flatRow} onPress={() => goToSettings('username')}>
          <Ionicons name="at" size={22} color="#fff" style={{ width: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>Username</Text>
            <Text style={styles.flatRowSubtitle}>@{profile.username || 'not set'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.flatRow} onPress={() => goToSettings('password')}>
          <Ionicons name="lock-closed" size={22} color="#fff" style={{ width: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>Password & Security</Text>
            <Text style={styles.flatRowSubtitle}>Update your login password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        <SectionHeader>Professional</SectionHeader>

        <TouchableOpacity style={styles.flatRow} onPress={() => navigation.navigate('ProfessionalMode')}>
          <Ionicons name="rocket" size={22} color="#fff" style={{ width: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>Professional Mode</Text>
            <Text style={styles.flatRowSubtitle}>{isPro ? 'Active — creator tools enabled' : 'Unlock followers, analytics & creator tools'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        {isPro && (
          <TouchableOpacity style={styles.flatRow} onPress={() => navigation.navigate('ProfessionalDashboard')}>
            <Ionicons name="star" size={22} color="#fff" style={{ width: 24 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.flatRowTitle}>Professional Dashboard</Text>
              <Text style={styles.flatRowSubtitle}>Views, engagement & audience insights</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6d7382" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.flatRow} onPress={() => navigation.navigate('GetVerified')}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" style={{ width: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>Get verified faster</Text>
            <Text style={styles.flatRowSubtitle}>{profile.is_verified ? 'You are verified' : 'Priority review of your verification request'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.flatRow} onPress={() => navigation.navigate('GetBoosted')}>
          <Ionicons name="flame" size={22} color="#fff" style={{ width: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>Boost eligibility</Text>
            <Text style={styles.flatRowSubtitle}>Reach more students with your posts</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, fontSize: 13, color: '#6d7382' },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 16 },
  flatRowTitle: { fontWeight: '500', fontSize: 15, color: '#fff' },
  flatRowSubtitle: { fontSize: 13, color: '#6d7382', marginTop: 2 },
});
