import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

export default function PendingScreen() {
  const { signOut, profile } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Glowing LU Logo Header */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Svg viewBox="0 0 200 200" width={90} height={90}>
            <Rect x="14" y="14" width="172" height="172" rx="34" fill="none" stroke="#ef4444" strokeWidth={6} />
            <Path d="M 62 60 L 62 130 L 96 130" fill="none" stroke="#ffffff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" fill="none" stroke="#ffffff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Text style={styles.logoText}>LU CONNECT</Text>
      </View>

      <View style={styles.divider} />

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="hourglass-outline" size={48} color="#ef4444" />
        </View>

        <Text style={styles.title}>Account Pending</Text>
        
        <Text style={styles.message}>
          Hi {profile?.full_name?.split(' ')[0] || 'Student'}, your account is currently awaiting admin review.
        </Text>
        
        <Text style={styles.subMessage}>
          An administrator will verify your admission number shortly. You will be able to log in once approved.
        </Text>
      </View>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#6d7382" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoBox: {
    marginBottom: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f1f1f',
    marginVertical: 30,
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  message: {
    color: '#aab0bd',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '600',
  },
  subMessage: {
    color: '#6d7382',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    width: '100%',
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  signOutText: {
    color: '#6d7382',
    fontSize: 15,
    fontWeight: '600',
  },
});
