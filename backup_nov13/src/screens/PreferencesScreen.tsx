import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopBar from '../components/TopBar';

const PREF_KEYS = {
  haptics: 'pref_haptics',
  sounds: 'pref_sounds',
  inAppNotifs: 'pref_in_app_notifs',
  quickAlerts: 'pref_quick_alerts',
};

export default function PreferencesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  
  const [haptics, setHaptics] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [quickAlerts, setQuickAlerts] = useState(true);

  useEffect(() => {
    (async () => {
      const h = await AsyncStorage.getItem(PREF_KEYS.haptics);
      const s = await AsyncStorage.getItem(PREF_KEYS.sounds);
      const n = await AsyncStorage.getItem(PREF_KEYS.inAppNotifs);
      const q = await AsyncStorage.getItem(PREF_KEYS.quickAlerts);

      if (h !== null) setHaptics(h === 'true');
      if (s !== null) setSounds(s === 'true');
      if (n !== null) setInAppNotifs(n === 'true');
      if (q !== null) setQuickAlerts(q === 'true');
      
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: string, value: boolean, setter: any) => {
    setter(value);
    await AsyncStorage.setItem(key, value.toString());
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        hero
        title="Preferences"
        subtitle="Control how the app interacts with you"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={<Ionicons name="color-palette" size={48} color="#ef4444" style={{ marginTop: 4 }} />}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          
          <Text style={styles.sectionHeader}>INTERACTIONS</Text>
          
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Vibrate on tap</Text>
              <Text style={styles.rowSub}>Haptic feedback on interactions</Text>
            </View>
            <Switch
              value={haptics}
              onValueChange={(v) => toggle(PREF_KEYS.haptics, v, setHaptics)}
              trackColor={{ false: '#1f1f1f', true: 'rgba(239,68,68,0.5)' }}
              thumbColor={haptics ? '#ef4444' : '#6d7382'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Notification sounds</Text>
              <Text style={styles.rowSub}>Play a chime when a notification arrives</Text>
            </View>
            <Switch
              value={sounds}
              onValueChange={(v) => toggle(PREF_KEYS.sounds, v, setSounds)}
              trackColor={{ false: '#1f1f1f', true: 'rgba(239,68,68,0.5)' }}
              thumbColor={sounds ? '#ef4444' : '#6d7382'}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>In-app notifications</Text>
              <Text style={styles.rowSub}>Show a banner when something happens</Text>
            </View>
            <Switch
              value={inAppNotifs}
              onValueChange={(v) => toggle(PREF_KEYS.inAppNotifs, v, setInAppNotifs)}
              trackColor={{ false: '#1f1f1f', true: 'rgba(239,68,68,0.5)' }}
              thumbColor={inAppNotifs ? '#ef4444' : '#6d7382'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Quick alerts</Text>
              <Text style={styles.rowSub}>Show the floating bubble for new messages</Text>
            </View>
            <Switch
              value={quickAlerts}
              onValueChange={(v) => toggle(PREF_KEYS.quickAlerts, v, setQuickAlerts)}
              trackColor={{ false: '#1f1f1f', true: 'rgba(239,68,68,0.5)' }}
              thumbColor={quickAlerts ? '#ef4444' : '#6d7382'}
            />
          </View>

          <View style={styles.divider} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 2,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  rowText: { flex: 1, paddingRight: 16 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  rowSub: { color: '#6d7382', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 16 },
});
