import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';
import Toast from 'react-native-toast-message';

export default function PaymentMethodsScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth();
  const [mpesa, setMpesa] = useState('');
  const [airtel, setAirtel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setMpesa(profile.mpesa_number || '');
      setAirtel(profile.airtel_number || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      mpesa_number: mpesa.trim(),
      airtel_number: airtel.trim(),
    }).eq('id', profile.id);

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } else {
      await reloadProfile();
      Toast.show({ type: 'success', text1: 'Numbers saved', text2: 'They will now be used for payments.' });
      navigation.goBack();
    }
    setSaving(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Payment Methods" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Link Your Numbers</Text>
        <Text style={{ color: '#6d7382', fontSize: 14, marginBottom: 30 }}>These numbers are used for your LU Pro subscription and payouts.</Text>

        {/* M-PESA BOX */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]}>
              <Ionicons name="phone-portrait" size={20} color="#22c55e" />
            </View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>M-Pesa Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0712345678"
            placeholderTextColor="#4b5563"
            value={mpesa}
            onChangeText={setMpesa}
            keyboardType="phone-pad"
            maxLength={12}
          />
        </View>

        {/* AIRTEL BOX */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }]}>
              <Ionicons name="phone-portrait" size={20} color="#ef4444" />
            </View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Airtel Money Number</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0734567890"
            placeholderTextColor="#4b5563"
            value={airtel}
            onChangeText={setAirtel}
            keyboardType="phone-pad"
            maxLength={12}
          />
        </View>

        <FastButton onPress={handleSave} disabled={saving} style={{ backgroundColor: '#ef4444', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 20 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 }}>Save Changes</Text>}
        </FastButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: '#141414', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, color: '#fff', fontSize: 16 },
});
