import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import LULogo from '../components/LULogo';
import TopBar from '../components/TopBar';

export default function LoginActivityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile?.id) return;
      const { data } = await supabase.from('login_history').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
      if (data) setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, [profile?.id]);

  const getDeviceIcon = (type: string) => type === 'laptop' ? 'laptop' : type === 'tablet' ? 'tablet-portrait' : 'phone-portrait';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Login Activity" showBack={true} onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom }}>
          <View style={styles.header}>
            <LULogo size={60} animate={false} />
            <Text style={styles.headerTitle}>Security Log</Text>
            <Text style={styles.headerSub}>Review where your account is accessed.</Text>
          </View>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
            <Text style={styles.infoText}>If you see a login you don't recognize, change your password immediately.</Text>
          </View>
          {history.length === 0 ? <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No login history found.</Text> : (
            history.map((item) => {
              const isSuccess = item.status === 'success';
              const isCurrent = isSuccess && item.device_id === profile?.active_device_id;
              return (
                <View key={item.id} style={[styles.card, !isSuccess && styles.cardFailed]}>
                  <View style={[styles.iconWrap, { backgroundColor: isCurrent ? 'rgba(34,197,94,0.15)' : isSuccess ? 'rgba(255,215,0,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                    <Ionicons name={getDeviceIcon(item.device_type)} size={24} color={isCurrent ? '#22c55e' : isSuccess ? '#FFD700' : '#ef4444'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.deviceName}>{item.device_name}</Text>
                      {isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current Device</Text></View>}
                    </View>
                    <Text style={styles.details}>{item.city && item.country ? `${item.city}, ${item.country}` : 'Unknown Location'} · {isCurrent ? 'Now' : formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Ionicons name="ellipse" size={8} color={isSuccess ? '#22c55e' : '#ef4444'} />
                      <Text style={{ color: isSuccess ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: '700' }}>{isSuccess ? 'Successful Login' : 'Blocked Attempt'}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 24, marginTop: 10 }, headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 16 }, headerSub: { color: '#6d7382', fontSize: 14, marginTop: 4 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(34,197,94,0.1)', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  infoText: { color: '#a1a1aa', fontSize: 13, flex: 1, lineHeight: 18 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  cardFailed: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' },
  iconWrap: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  deviceName: { color: '#fff', fontSize: 16, fontWeight: '700' }, details: { color: '#6d7382', fontSize: 13, marginTop: 4 },
  currentBadge: { backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }, currentBadgeText: { color: '#22c55e', fontSize: 10, fontWeight: '800' },
});
