import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function PaymentMethodsScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth(); // 🔥 Added reloadProfile
  const insets = useSafeAreaInsets();
  const [mpesa, setMpesa] = useState('');
  const [airtel, setAirtel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the numbers when the screen opens or profile changes
  useEffect(() => {
    if (profile) {
      setMpesa(profile.mpesa_number || '');
      setAirtel(profile.airtel_number || '');
      setLoading(false);
    }
  }, [profile]);

  const saveNumbers = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        mpesa_number: mpesa.trim(),
        airtel_number: airtel.trim(),
      }).eq('id', profile.id);

      if (error) throw error;

      // 🔥 THE FIX: Tell AuthContext to reload the profile from DB
      if (reloadProfile) await reloadProfile();

      Toast.show({ type: 'success', text1: 'Saved', text2: 'Payment methods updated.' });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#ef4444" /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Payment Methods</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>Link Your Numbers</Text>
        <Text style={styles.subtitle}>These numbers are used for your LU Pro subscription and payouts.</Text>

        {/* M-PESA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <Ionicons name="phone-portrait" size={20} color="#22c55e" />
            </View>
            <Text style={styles.cardTitle}>M-Pesa Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0712345678"
            placeholderTextColor="#6d7382"
            keyboardType="phone-pad"
            value={mpesa}
            onChangeText={setMpesa}
          />
        </View>

        {/* AIRTEL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Ionicons name="phone-portrait" size={20} color="#ef4444" />
            </View>
            <Text style={styles.cardTitle}>Airtel Money Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0734567890"
            placeholderTextColor="#6d7382"
            keyboardType="phone-pad"
            value={airtel}
            onChangeText={setAirtel}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveNumbers} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#6d7382', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  card: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16 },
  saveBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 16 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
