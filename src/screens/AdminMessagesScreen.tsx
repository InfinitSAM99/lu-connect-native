import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import * as Clipboard from 'expo-clipboard';

export default function AdminMessagesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
      
    if (!error && data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleApprove = async (item: any) => {
    try {
      const { data: bannedData } = await supabase.from('banned_devices').select('device_id').eq('email', item.email).maybeSingle();
      
      if (bannedData) {
        const { data: accountId, error } = await supabase.rpc('admin_resolve_device_ban', {
          p_device_id: bannedData.device_id,
          p_user_email: item.email
        });
        
        if (error) throw error;

        await supabase.from('admin_messages').update({ is_read: true }).eq('id', item.id);
        
        Alert.alert(
          'Device Unbanned',
          `Account ID for ${item.email}:\n\n${accountId || 'No pattern set.'}\n\n(Copied to clipboard)`,
          [{ text: 'OK' }]
        );
        
        if (accountId) {
          await Clipboard.setStringAsync(accountId);
        }
        
        fetchMessages();
      } else {
        Alert.alert('Error', 'No banned device found for this email.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RECOVERY MESSAGES</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : messages.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Ionicons name="checkmark-done-circle" size={64} color="#1f1f1f" />
          <Text style={{ color: '#6d7382', marginTop: 20 }}>No pending messages.</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.detail}><Text style={styles.label}>ADM:</Text> {item.admission_number}</Text>
              <Text style={styles.detail}><Text style={styles.label}>DOB:</Text> {item.dob}</Text>
              <Text style={styles.detail}><Text style={styles.label}>UNI:</Text> {item.university_name}</Text>
              <Text style={styles.message}>"{item.message}"</Text>
              
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={styles.approveText}>VERIFY & UNBAN</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  
  card: { backgroundColor: '#0a0a0a', borderRadius: 12, borderWidth: 1, borderColor: '#1f1f1f', padding: 16, marginBottom: 16 },
  email: { color: '#ef4444', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  detail: { color: '#fff', fontSize: 14, marginBottom: 4 },
  label: { color: '#6d7382', fontSize: 12 },
  message: { color: '#6d7382', fontSize: 14, fontStyle: 'italic', marginTop: 12, marginBottom: 16, lineHeight: 20 },
  
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', padding: 12, borderRadius: 8 },
  approveText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
});
