import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

function ListRow({ iconName, title, onClick, danger }: any) {
  return (
    <TouchableOpacity style={styles.row} onPress={onClick} activeOpacity={0.6}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={24} color={danger ? '#ef4444' : '#fff'} />
      </View>
      <Text style={[styles.rowTitle, danger && { color: '#ef4444' }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={danger ? '#ef4444' : '#6d7382'} />
    </TouchableOpacity>
  );
}

export default function AccountSettingsScreen({ navigation }: any) {
  const { profile, user } = useAuth();
  const insets = useSafeAreaInsets();

  // Fallback to google metadata if profile hasn't loaded
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const displayEmail = user?.email || 'Unknown Email';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACCOUNT SETTINGS</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 + insets.bottom }}>
        {/* LU LOGO HERO */}
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Text style={styles.logoTextLU}>LU</Text>
          </View>
          <Text style={styles.heroTitle}>LU CONNECT</Text>
        </View>

        {/* GOOGLE ACCOUNT CARD */}
        <View style={styles.googleCard}>
          <View style={styles.googleHeader}>
            {/* Official Google SVG Logo */}
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </Svg>
            <Text style={styles.googleText}>Google Account</Text>
          </View>
          <Text style={styles.googleName}>{displayName}</Text>
          <Text style={styles.googleEmail}>{displayEmail}</Text>
        </View>

        {/* LIST ROWS */}
        <View style={styles.listGroup}>
          <ListRow
            iconName="person-outline"
            title="Edit Personal Details"
            onClick={() => navigation.navigate('ProfileEdit')}
          />
          <ListRow
            iconName="at"
            title={`@${profile?.username || 'username'}`}
            onClick={() => {}} // Read-only
          />
          <ListRow
            iconName="trash-outline"
            title="Delete Account"
            onClick={() => {
              alert("This will permanently delete your account. Please contact support to confirm.");
            }}
            danger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  
  hero: { alignItems: 'center', marginVertical: 10 },
  logoBox: { width: 80, height: 80, borderRadius: 22, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', marginBottom: 12 },
  logoTextLU: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  
  googleCard: { backgroundColor: '#141414', borderRadius: 16, padding: 20, marginTop: 24, marginBottom: 20, borderWidth: 1, borderColor: '#1f1f1f' },
  googleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  googleText: { color: '#aab0bd', fontSize: 14, fontWeight: '600' },
  googleName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  googleEmail: { color: '#6d7382', fontSize: 14 },
  
  listGroup: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
  iconWrap: { width: 40, marginRight: 16, alignItems: 'flex-start', justifyContent: 'center' },
  rowTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' }
});
