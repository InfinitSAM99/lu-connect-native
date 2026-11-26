import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../components/TopBar';
import AutoPlayPreview from '../components/AutoPlayPreview';
import { useAuth } from '../context/AuthContext';

export default function NavigationStyleScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { navType, setNavType } = useAuth(); // Pull global state

  const toggleNav = (value: boolean) => {
    setNavType(value ? 'top' : 'radial');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Navigation Style" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 + insets.bottom }}>
        
        <Text style={styles.title}>Choose your vibe</Text>
        <Text style={styles.subtitle}>Toggle between the classic top bar or the modern floating radial menu.</Text>

        <AutoPlayPreview />

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Use Top Navigation</Text>
            <Text style={styles.toggleSub}>{navType === 'top' ? 'Currently using Top Bar' : 'Currently using Radial Menu'}</Text>
          </View>
          <Switch
            value={navType === 'top'}
            onValueChange={toggleNav}
            trackColor={{ false: '#2a2a2a', true: '#ef4444' }}
            thumbColor={'#fff'}
            ios_backgroundColor="#2a2a2a"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#6d7382" />
          <Text style={styles.infoText}>
            If you choose Top Navigation, the floating radial button will be hidden on the Feed, Messages, and Network screens. You can switch back at any time.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#6d7382', fontSize: 14, lineHeight: 22, marginBottom: 32 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1f1f1f' },
  toggleTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  toggleSub: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  infoBox: { flexDirection: 'row', backgroundColor: '#121212', padding: 16, borderRadius: 12, marginTop: 24, gap: 12 },
  infoText: { flex: 1, color: '#6d7382', fontSize: 13, lineHeight: 20 }
});
