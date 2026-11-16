import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopBar from '../components/TopBar';
import { RINGTONE_OPTIONS, playRingtone, stopRingtone } from '../lib/ringtone';

export default function NotificationSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [ringtoneId, setRingtoneId] = useState('app_default');
  const [ringtoneModal, setRingtoneModal] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem('pref_sounds');
      const n = await AsyncStorage.getItem('pref_in_app_notifs');
      const r = await AsyncStorage.getItem('pref_ringtone_id');
      if (s !== null) setSounds(s === 'true');
      if (n !== null) setInAppNotifs(n === 'true');
      if (r !== null) setRingtoneId(r);
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: string, value: boolean, setter: any) => {
    setter(value);
    await AsyncStorage.setItem(key, value.toString());
  };

  const selectedRingtoneName = RINGTONE_OPTIONS.find(r => r.id === ringtoneId)?.name || 'LU Connect (Inbuilt)';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Notifications" showBack={true} onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        <Text style={styles.sectionHeader}>CALLS</Text>
        
        <TouchableOpacity style={styles.row} onPress={() => setRingtoneModal(true)}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Ringtone</Text>
            <Text style={styles.rowSub}>{selectedRingtoneName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6d7382" />
        </TouchableOpacity>
        
        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>MESSAGES & NOTIFICATIONS</Text>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Notification Sounds</Text>
            <Text style={styles.rowSub}>Play sounds for messages</Text>
          </View>
          <Switch value={sounds} onValueChange={(v) => toggle('pref_sounds', v, setSounds)} trackColor={{ false: '#1f1f1f', true: '#ef4444' }} thumbColor="#fff" />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>In-App Notifications</Text>
            <Text style={styles.rowSub}>Show banner when app is open</Text>
          </View>
          <Switch value={inAppNotifs} onValueChange={(v) => toggle('pref_in_app_notifs', v, setInAppNotifs)} trackColor={{ false: '#1f1f1f', true: '#ef4444' }} thumbColor="#fff" />
        </View>
      </ScrollView>

      <Modal visible={ringtoneModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ringtone</Text>
              <TouchableOpacity onPress={() => setRingtoneModal(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            {RINGTONE_OPTIONS.map((rt) => (
              <TouchableOpacity 
                key={rt.id} style={styles.modalRow}
                onPress={async () => {
                  setRingtoneId(rt.id);
                  await AsyncStorage.setItem('pref_ringtone_id', rt.id);
                  if (rt.id === 'app_default') { playRingtone(); setTimeout(() => stopRingtone(), 3000); }
                }}
              >
                <Ionicons name={ringtoneId === rt.id ? "radio-button-on" : "radio-button-off"} size={24} color={ringtoneId === rt.id ? "#ef4444" : "#6d7382"} />
                <Text style={{ color: '#fff', fontSize: 16, marginLeft: 12 }}>{rt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  rowText: { flex: 1, paddingRight: 16 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  rowSub: { color: '#6d7382', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
});
