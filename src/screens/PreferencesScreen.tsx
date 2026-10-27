import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { tapMedium } from '../lib/haptics';
import TopBar from '../components/TopBar';

// --- Custom Smooth Toggle ---
function AnimatedToggle({ value, onValueChange }: { value: boolean, onValueChange: () => void }) {
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // We are animating backgroundColor & left, so must be false
    }).start();
  }, [value]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // 46 width - 20 thumb - 2*2 padding
  });

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1f1f1f', '#ef4444'],
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onValueChange}>
      <Animated.View style={[styles.toggleTrack, { backgroundColor }]}>
        <Animated.View style={[styles.toggleThumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function PreferencesScreen({ navigation }: any) {
  const { profile, reloadProfile } = useAuth();
  const insets = useSafeAreaInsets();

  if (!profile) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;

  const hapticsOn = profile.haptics_enabled !== false;
  const toastOn = profile.toast_enabled !== false;
  const soundOn = profile.notification_sound_enabled !== false;
  const alertsOn = profile.alerts_enabled !== false;

  const saveToggle = async (field: string, next: boolean) => {
    if (next) await tapMedium();
    const { error } = await supabase.from('profiles').update({ [field]: next }).eq('id', profile.id);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await reloadProfile?.();
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

      <View style={{ paddingTop: 8 }}>
        <Text style={styles.sectionHeader}>Interactions</Text>

        <ToggleRow
          iconName="phone-portrait-outline"
          title="Vibrate on tap"
          subtitle="Haptic feedback on interactions"
          on={hapticsOn}
          onToggle={() => saveToggle('haptics_enabled', !hapticsOn)}
        />
        <ToggleRow
          iconName="notifications-outline"
          title="In-app notifications"
          subtitle="Show a popup when something happens"
          on={toastOn}
          onToggle={() => saveToggle('toast_enabled', !toastOn)}
        />
        <ToggleRow
          iconName="volume-high-outline"
          title="Notification sound"
          subtitle="Play a chime when a notification arrives"
          on={soundOn}
          onToggle={() => saveToggle('notification_sound_enabled', !soundOn)}
        />
        <ToggleRow
          iconName="notifications-outline"
          title="In-app alerts"
          subtitle="Show red pulse on Feed for new messages"
          on={alertsOn}
          onToggle={() => saveToggle('alerts_enabled', !alertsOn)}
        />
        <ToggleRow
          iconName="notifications-outline"
          title="In-app alerts"
          subtitle="Show red pulse on Feed for new messages"
          on={alertsOn}
          onToggle={() => saveToggle('alerts_enabled', !alertsOn)}
        />
      </View>
    </View>
  );
}

function ToggleRow({ iconName, title, subtitle, on, onToggle }: any) {
  return (
    <View style={styles.row}>
      <View style={{ width: 24, alignItems: 'center' }}>
        <Ionicons name={iconName} size={22} color="#fff" />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontWeight: '500', fontSize: 15, color: '#fff' }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <AnimatedToggle value={on} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, fontSize: 13, color: '#6d7382' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  
  // Custom Toggle Styles
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  }
});
