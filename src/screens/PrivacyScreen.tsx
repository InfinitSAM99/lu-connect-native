import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopBar from '../components/TopBar';

const PRIVACY_OPTIONS = ['Everyone', 'My Connections', 'Nobody'];
const KEYS = {
  lastSeen: 'priv_last_seen',
  profilePic: 'priv_profile_pic',
  about: 'priv_about',
  readReceipts: 'priv_read_receipts',
};

export default function PrivacyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [lastSeen, setLastSeen] = useState('Everyone');
  const [profilePic, setProfilePic] = useState('My Connections');
  const [about, setAbout] = useState('My Connections');
  const [readReceipts, setReadReceipts] = useState(true);
  const [activePicker, setActivePicker] = useState<{ key: string, value: string } | null>(null);

  useEffect(() => {
    (async () => {
      const ls = await AsyncStorage.getItem(KEYS.lastSeen);
      const pp = await AsyncStorage.getItem(KEYS.profilePic);
      const ab = await AsyncStorage.getItem(KEYS.about);
      const rr = await AsyncStorage.getItem(KEYS.readReceipts);
      if (ls) setLastSeen(ls);
      if (pp) setProfilePic(pp);
      if (ab) setAbout(ab);
      if (rr) setReadReceipts(rr === 'true');
    })();
  }, []);

  const updateSetting = async (key: string, value: string, setter: any) => {
    setter(value);
    await AsyncStorage.setItem(key, value);
    setActivePicker(null);
  };

  const toggleReadReceipts = async (val: boolean) => {
    setReadReceipts(val);
    await AsyncStorage.setItem(KEYS.readReceipts, val.toString());
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Privacy" showBack={true} onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        <View style={styles.banner}>
          <Ionicons name="lock-closed" size={28} color="#22c55e" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Privacy checkup</Text>
            <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 2 }}>Control your privacy settings.</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>WHO CAN SEE MY PERSONAL INFO</Text>

        <TouchableOpacity style={styles.row} onPress={() => setActivePicker({ key: KEYS.lastSeen, value: lastSeen })}>
          <View style={styles.rowText}><Text style={styles.rowTitle}>Last seen and online</Text><Text style={styles.rowSub}>{lastSeen}</Text></View>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setActivePicker({ key: KEYS.profilePic, value: profilePic })}>
          <View style={styles.rowText}><Text style={styles.rowTitle}>Profile picture</Text><Text style={styles.rowSub}>{profilePic}</Text></View>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setActivePicker({ key: KEYS.about, value: about })}>
          <View style={styles.rowText}><Text style={styles.rowTitle}>About</Text><Text style={styles.rowSub}>{about}</Text></View>
        </TouchableOpacity>
        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}><Text style={styles.rowTitle}>Read receipts</Text><Text style={styles.rowSub}>If turned off, you won't send or receive read receipts.</Text></View>
          <Switch value={readReceipts} onValueChange={toggleReadReceipts} trackColor={{ false: '#1f1f1f', true: '#22c55e' }} thumbColor="#fff" />
        </View>
        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>MESSAGING</Text>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowText}><Text style={styles.rowTitle}>Blocked contacts</Text><Text style={styles.rowSub}>Manage blocked accounts</Text></View>
          <Ionicons name="chevron-forward" size={20} color="#6d7382" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('BiometricSettingsScreen')}>
          <View style={styles.rowText}><Text style={styles.rowTitle}>App Lock</Text><Text style={styles.rowSub}>Require fingerprint to open app</Text></View>
          <Ionicons name="chevron-forward" size={20} color="#6d7382" />
        </TouchableOpacity>
        <View style={styles.divider} />

      </ScrollView>

      <Modal visible={!!activePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Who can see this?</Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            {PRIVACY_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt} style={styles.modalRow} onPress={() => {
                if (activePicker?.key === KEYS.lastSeen) updateSetting(KEYS.lastSeen, opt, setLastSeen);
                if (activePicker?.key === KEYS.profilePic) updateSetting(KEYS.profilePic, opt, setProfilePic);
                if (activePicker?.key === KEYS.about) updateSetting(KEYS.about, opt, setAbout);
              }}>
                <Ionicons name={activePicker?.value === opt ? "radio-button-on" : "radio-button-off"} size={24} color={activePicker?.value === opt ? "#22c55e" : "#6d7382"} />
                <Text style={{ color: '#fff', fontSize: 16, marginLeft: 12 }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f291e', margin: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#14532d' },
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
