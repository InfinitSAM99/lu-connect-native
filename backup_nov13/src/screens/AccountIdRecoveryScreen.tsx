import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function AccountIdRecoveryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onRecover = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc('recover_with_account_id', { p_code: code.trim() });
      if (error) throw error;
      if (data) {
        // Session recovered. Reload app or navigate to Feed.
        navigation.reset({ index: 0, routes: [{ name: 'Feed' }] });
      } else {
        setErrorMsg('Invalid Account ID or account is locked.');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>RECOVER ACCOUNT</Text>
      <Text style={styles.sub}>Enter the Account ID you saved when you set up your security questions.</Text>

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <TextInput
        style={styles.input}
        placeholder="LU-XXXX-XXXX-XXXX"
        placeholderTextColor="#6d7382"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <TouchableOpacity style={[styles.primaryBtn, !code.trim() && { opacity: 0.5 }]} onPress={onRecover} disabled={!code.trim() || loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>RECOVER SESSION</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  sub: { color: '#6d7382', fontSize: 14, lineHeight: 20, marginBottom: 30 },
  input: { backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 16, fontSize: 18, letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  primaryBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 20, fontSize: 13 },
});
