import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

export default function SessionLockScreen({ navigation }: any) {
  const { kickoutReason, profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      {/* LU CONNECT LOGO */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoTextLU}>LU</Text>
        </View>
        <Text style={styles.logoTextConnect}>LU CONNECT</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* User Profile Card */}
      <View style={styles.profileCard}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        {profile?.email ? <Text style={styles.email}>{profile.email}</Text> : null}
        {profile?.university_name ? (
          <View style={styles.universityBadge}>
            <Ionicons name="school" size={12} color="#ef4444" />
            <Text style={styles.universityText} numberOfLines={1}>{profile.university_name}</Text>
          </View>
        ) : null}
      </View>

      {/* Warning Message */}
      <View style={styles.warningBox}>
        <Ionicons name="shield-checkmark" size={32} color="#ef4444" />
        <Text style={styles.warningTitle}>Session Ended</Text>
        <Text style={styles.warningMessage}>
          {kickoutReason || 'Your account was signed in on another device for your security.'}
        </Text>
      </View>

      {/* Sign Back In Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => signOut()} style={styles.primaryBtn}>
          <Ionicons name="log-in-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Sign Back In</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>Only one device can be active at a time.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    marginBottom: 16,
  },
  logoTextLU: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  logoTextConnect: {
    color: '#ef4444',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  divider: {
    width: SCREEN_W - 48,
    height: 1,
    backgroundColor: '#1f1f1f',
    marginVertical: 24,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#ef4444',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ef4444',
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: '#6d7382',
    fontSize: 13,
    marginBottom: 10,
  },
  universityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#1a0d0f',
    borderWidth: 1,
    borderColor: '#3b1215',
    maxWidth: SCREEN_W - 96,
  },
  universityText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  warningBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginBottom: 32,
    width: '100%',
  },
  warningTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  warningMessage: {
    color: '#aab0bd',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    color: '#6d7382',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
