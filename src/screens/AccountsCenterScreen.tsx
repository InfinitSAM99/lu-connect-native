import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountsCenterScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [showVoteDrawer, setShowVoteDrawer] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACCOUNT CENTER</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HUGE INFINIT CO BRANDING */}
        <View style={styles.brandingTop}>
          <Image 
            source={require('../../assets/images/infinit_logo.png')} 
            style={styles.hugeLogo} 
          />
          <Text style={styles.brandText}>INFINIT CO ACCOUNT</Text>
        </View>

        <View style={styles.divider} />

        {/* SECURITY STATUS */}
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={48} color="#ef4444" />
          </View>
          <Text style={styles.title}>Your Account is Secure</Text>
          <Text style={styles.subtitle}>
            LU Connect uses Google Authentication to keep your account safe. You don't need to remember a separate password.
          </Text>
        </View>

        {/* LOGIN EMAIL CARD */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="mail" size={20} color="#aab0bd" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Login Email</Text>
              <Text style={styles.rowValue}>{user?.email || 'Unknown'}</Text>
            </View>
          </View>
        </View>

        {/* NAVIGATION TO ACCOUNT SETTINGS */}
        <TouchableOpacity 
          style={styles.actionBanner} 
          onPress={() => navigation.navigate('AccountSettings')}
        >
          <View style={styles.actionIconWrap}>
            <Ionicons name="settings" size={24} color="#fff" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Account Settings</Text>
            <Text style={styles.actionSub}>Personal details, delete account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6d7382" />
        </TouchableOpacity>

        {/* LU VOTE BANNER */}
        <TouchableOpacity 
          style={styles.actionBanner} 
          onPress={() => setShowVoteDrawer(true)}
        >
          <View style={styles.actionIconWrap}>
            <Ionicons name="stats-chart" size={24} color="#fff" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>LU Vote</Text>
            <Text style={styles.actionSub}>Secure campus elections</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6d7382" />
        </TouchableOpacity>

        <Text style={styles.footerText}>
          If you ever lose access to your Google account, you will need to contact the LU Connect Admin to recover your profile.
        </Text>

      </ScrollView>

      {/* LU VOTE COMING SOON DRAWER */}
      <Modal visible={showVoteDrawer} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.drawer}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerContent}>
              <View style={styles.drawerIcon}>
                <Ionicons name="stats-chart" size={40} color="#ef4444" />
              </View>
              <Text style={styles.drawerTitle}>LU Vote</Text>
              <Text style={styles.drawerSub}>Coming Soon</Text>
              <Text style={styles.drawerDesc}>
                We are building a secure, transparent, and easy-to-use voting system for your campus elections. Stay tuned!
              </Text>
              <TouchableOpacity style={styles.drawerCloseBtn} onPress={() => setShowVoteDrawer(false)}>
                <Text style={styles.drawerCloseText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  brandingTop: { alignItems: 'center', marginTop: 20, marginBottom: 10 },
  hugeLogo: { width: 260, height: 100, resizeMode: 'contain', marginBottom: 4 },
  brandText: { color: '#6d7382', fontSize: 10, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#1f1f1f', width: '100%', marginVertical: 24 },
  hero: { alignItems: 'center', marginVertical: 10 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  subtitle: { color: '#6d7382', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  card: { backgroundColor: '#141414', borderRadius: 16, padding: 20, marginTop: 24, marginBottom: 20, borderWidth: 1, borderColor: '#1f1f1f' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowText: { flex: 1 },
  rowLabel: { color: '#6d7382', fontSize: 12, marginBottom: 4 },
  rowValue: { color: '#fff', fontSize: 15, fontWeight: '500' },
  actionBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 16, padding: 16, marginBottom: 16 },
  actionIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionTextWrap: { flex: 1 },
  actionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  actionSub: { color: '#6d7382', fontSize: 12 },
  footerText: { color: '#6d7382', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  drawer: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  drawerContent: { alignItems: 'center', paddingHorizontal: 30 },
  drawerIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  drawerTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  drawerSub: { color: '#ef4444', fontSize: 14, fontWeight: '600', marginBottom: 20, letterSpacing: 1, textTransform: 'uppercase' },
  drawerDesc: { color: '#6d7382', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  drawerCloseBtn: { backgroundColor: '#141414', width: '100%', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1f1f1f' },
  drawerCloseText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
