import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import TopBar from '../components/TopBar';

const PREF_KEYS = {
  haptics: 'pref_haptics',
  sounds: 'pref_sounds',
  inAppNotifs: 'pref_in_app_notifs',
  quickAlerts: 'pref_quick_alerts',
};

export default function PreferencesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [quickAlerts, setQuickAlerts] = useState(true);

  // Load audio players
  const samsungSound = useAudioPlayer(require('../../assets/sounds/samsung.mp3'));
  const tapSound = useAudioPlayer(require('../../assets/sounds/like.mp3'));

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

  const toggle = async (key: string, value: boolean, setter: any, soundToPlay?: any) => {
    setter(value);
    await AsyncStorage.setItem(key, value.toString());
    
    // Play sound if turning ON and a sound is provided
    if (value && soundToPlay) {
      try {
        soundToPlay.seekTo(0);
        soundToPlay.play();
      } catch (e) {
        console.log("Audio error:", e);
      }
    }
  };

  const renderSwitch = (value: boolean, onValueChange: (v: boolean) => void) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#2a2a2a', true: '#ef4444' }}
      thumbColor={'#fff'}
      ios_backgroundColor="#2a2a2a"
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        hero
        title="Preferences"
        subtitle="Control how the app interacts with you"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }} showsVerticalScrollIndicator={false}>

          {/* INTERACTIONS SECTION */}
          <Text style={styles.sectionHeader}>INTERACTIONS</Text>
          
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Vibrate on tap</Text>
              <Text style={styles.rowSub}>Haptic feedback on interactions</Text>
            </View>
            {renderSwitch(haptics, (v) => toggle(PREF_KEYS.haptics, v, setHaptics, tapSound))}
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Notification sounds</Text>
              <Text style={styles.rowSub}>Play a chime when a notification arrives</Text>
            </View>
            {renderSwitch(sounds, (v) => toggle(PREF_KEYS.sounds, v, setSounds, samsungSound))}
          </View>

          {/* NOTIFICATIONS SECTION */}
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>In-app notifications</Text>
              <Text style={styles.rowSub}>Show a banner when something happens</Text>
            </View>
            {renderSwitch(inAppNotifs, (v) => toggle(PREF_KEYS.inAppNotifs, v, setInAppNotifs))}
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Quick alerts</Text>
              <Text style={styles.rowSub}>Show the floating bubble for new messages</Text>
            </View>
            {renderSwitch(quickAlerts, (v) => toggle(PREF_KEYS.quickAlerts, v, setQuickAlerts))}
          </View>
          
          <View style={styles.divider} />

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5,
    marginTop: 32, marginBottom: 12, paddingHorizontal: 24, 
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 20, 
  },
  rowText: { flex: 1, paddingRight: 16 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  rowSub: { color: '#6d7382', fontSize: 13, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginHorizontal: 24 },
});
