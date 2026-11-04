import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const EVENT_COLORS: Record<string, string> = {
  failed_login: '#f97316',
  rls_violation: '#ef4444',
  rate_limit: '#eab308',
  suspicious_activity: '#a855f7',
};

const EVENT_LABELS: Record<string, string> = {
  failed_login: 'Failed Login',
  rls_violation: 'RLS Violation',
  rate_limit: 'Rate Limit Hit',
  suspicious_activity: 'Suspicious Activity',
};

export default function AdminSecurityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeLog, setActiveLog] = useState<any>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) setLogs(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={styles.container}>
      {/* HERO HEADER */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.logoBox}><Text style={styles.logoTextLU}>LU</Text></View>
          <Text style={styles.logoTextConnect}>SECURITY CENTER</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Threat Monitor</Text>
        <Text style={styles.pageSub}>Real-time view of failed logins, RLS violations, and suspicious activity.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
          ListEmptyComponent={<Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No security events logged yet.</Text>}
          renderItem={({ item: log }) => (
            <TouchableOpacity style={styles.logRow} onPress={() => setActiveLog(log)} activeOpacity={0.7}>
              <View style={[styles.iconWrap, { backgroundColor: `${EVENT_COLORS[log.event_type]}15` }]}>
                <Ionicons 
                  name={log.event_type === 'rls_violation' ? 'warning' : log.event_type === 'failed_login' ? 'lock-closed' : 'alert-circle'} 
                  size={24} 
                  color={EVENT_COLORS[log.event_type] || '#6d7382'} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logTitle}>{EVENT_LABELS[log.event_type] || log.event_type}</Text>
                <Text style={styles.logSub} numberOfLines={1}>{log.email || 'Unknown user'}</Text>
                <Text style={styles.logTime}>{new Date(log.created_at).toLocaleString()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#1f1f1f" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* DETAIL MODAL */}
      <Modal visible={!!activeLog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
            <View style={styles.drawerHandle} />
            
            {activeLog && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setActiveLog(null)} style={{ padding: 8 }}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'center', paddingBottom: 24 }}>
                  <View style={[styles.iconWrap, { width: 80, height: 80, borderRadius: 40, backgroundColor: `${EVENT_COLORS[activeLog.event_type]}15` }]}>
                    <Ionicons 
                      name={activeLog.event_type === 'rls_violation' ? 'warning' : activeLog.event_type === 'failed_login' ? 'lock-closed' : 'alert-circle'} 
                      size={40} 
                      color={EVENT_COLORS[activeLog.event_type] || '#6d7382'} 
                    />
                  </View>
                  <Text style={[styles.logTitle, { fontSize: 22, marginTop: 16 }]}>{EVENT_LABELS[activeLog.event_type]}</Text>
                  <Text style={styles.logTime}>{new Date(activeLog.created_at).toLocaleString()}</Text>
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailsHeader}>EVENT DETAILS</Text>
                  <Text style={styles.detailText}><Text style={{ fontWeight: '700' }}>Email:</Text> {activeLog.email || 'N/A'}</Text>
                  <Text style={styles.detailText}><Text style={{ fontWeight: '700' }}>IP Address:</Text> {activeLog.ip_address || 'Not captured'}</Text>
                  <Text style={styles.detailText}><Text style={{ fontWeight: '700' }}>User Agent:</Text> {activeLog.user_agent || 'Not captured'}</Text>
                </View>

                {activeLog.details && (
                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsHeader}>RAW DATA</Text>
                    <Text style={{ color: '#6d7382', fontFamily: 'monospace', fontSize: 12 }}>
                      {JSON.stringify(activeLog.details, null, 2)}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hero: { paddingHorizontal: 16, paddingBottom: 20, backgroundColor: '#000' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroContent: { alignItems: 'center' },
  logoBox: { width: 70, height: 70, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', marginBottom: 10 },
  logoTextLU: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoTextConnect: { color: '#ef4444', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },
  
  headerSection: { paddingHorizontal: 16, paddingVertical: 20 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  pageSub: { color: '#6d7382', fontSize: 13 },

  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16, gap: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  logSub: { color: '#aab0bd', fontSize: 13 },
  logTime: { color: '#6d7382', fontSize: 11, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#000', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalHeader: { alignItems: 'flex-end', paddingHorizontal: 16 },
  detailsBox: { padding: 20, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  detailsHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  detailText: { color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 20 },
});
