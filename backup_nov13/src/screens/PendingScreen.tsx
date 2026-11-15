import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function PendingScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>⏳</Text>
        <Text style={styles.title}>Account Pending</Text>
        <Text style={styles.body}>
          Your account is awaiting admin review. An administrator will verify your admission number shortly.
        </Text>

        {profile?.admission_number && (
          <View style={styles.admBox}>
            <Text style={styles.admLabel}>Admission number submitted</Text>
            <Text style={styles.admValue}>{profile.admission_number}</Text>
          </View>
        )}

        <Text style={styles.note}>You will be able to log in once your account is approved.</Text>

        <TouchableOpacity style={styles.btn} onPress={signOut}>
          <Text style={styles.btnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 16, padding: 28, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#ef4444', marginBottom: 12 },
  body: { color: '#aab0bd', fontSize: 14, lineHeight: 22, marginBottom: 20, textAlign: 'center' },
  admBox: { backgroundColor: '#141414', padding: 12, borderRadius: 8, marginBottom: 16, width: '100%', alignItems: 'center' },
  admLabel: { fontSize: 12, color: '#6d7382', marginBottom: 4 },
  admValue: { fontWeight: '700', fontSize: 15, color: '#fff' },
  note: { color: '#fff', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  btn: { width: '100%', backgroundColor: '#ef4444', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
