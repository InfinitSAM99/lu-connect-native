import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { APP_ICONS, setAppIcon } from '../lib/appIcons';
import TopBar from '../components/TopBar';
import Toast from 'react-native-toast-message';
import { tapLight, tapHeavy } from '../lib/haptics';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 12;
const ICON_SIZE = (width - 40 - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

export default function AppIconScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  
  const isPremium = profile?.subscription_tier === 'premium';
  const [selectedId, setSelectedId] = useState('default');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleSelectIcon = async (iconId: string) => {
    if (!isPremium && iconId !== 'default') {
      tapHeavy();
      setShowUpgradeModal(true);
      return;
    }

    tapLight();
    setSelectedId(iconId);
    await setAppIcon(iconId);
    Toast.show({ type: 'success', text1: 'Icon Changed', text2: 'Your app icon has been updated.' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="App Icon" showBack={true} onBack={() => navigation.goBack()} />
      
      <View style={{ padding: 20, paddingBottom: 100 + insets.bottom }}>
        <Text style={styles.header}>Choose your style</Text>
        <Text style={styles.subHeader}>Personalize your home screen with exclusive LU Connect icons.</Text>

        <View style={styles.grid}>
          {APP_ICONS.map((icon) => {
            const isLocked = !isPremium && icon.id !== 'default';
            const isActive = selectedId === icon.id;

            return (
              <TouchableOpacity
                key={icon.id}
                style={[styles.iconCard, isActive && styles.iconCardActive]}
                onPress={() => handleSelectIcon(icon.id)}
                activeOpacity={0.8}
              >
                <View style={{ position: 'relative', width: '100%', aspectRatio: 1, marginBottom: 8 }}>
                  <Image source={icon.image} style={styles.iconImage} resizeMode="cover" />
                  {isLocked && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={20} color="#FFD700" />
                    </View>
                  )}
                </View>
                <Text style={[styles.iconName, isActive && { color: '#FFD700' }]} numberOfLines={1}>
                  {icon.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Modal visible={showUpgradeModal} transparent animationType="fade" onRequestClose={() => setShowUpgradeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={['rgba(255,215,0,0.15)', 'transparent']} style={styles.modalGlow} />
            <View style={styles.diamondWrap}>
              <LinearGradient colors={['#FFDF00', '#D4AF37']} style={styles.diamondBg}>
                <Ionicons name="diamond" size={32} color="#000" />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>Unlock LU Pro</Text>
            <Text style={styles.modalDesc}>Custom App Icons are an exclusive LU Pro feature. Upgrade today to unlock this and many more premium features.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUpgradeModal(false)}>
                <Text style={styles.cancelText}>Maybe Later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.upgradeBtn} onPress={() => { setShowUpgradeModal(false); navigation.navigate('SubscriptionScreen'); }}>
                <LinearGradient colors={['#FFDF00', '#D4AF37']} style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
                  <Text style={styles.upgradeText}>View LU Pro</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subHeader: { color: '#6d7382', fontSize: 14, marginBottom: 24, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  iconCard: { width: ICON_SIZE, backgroundColor: '#141414', borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconCardActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },
  iconImage: { width: '100%', height: '100%', borderRadius: 12 },
  iconName: { color: '#a1a1aa', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: width * 0.85, backgroundColor: '#121212', borderRadius: 32, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', overflow: 'hidden' },
  modalGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  diamondWrap: { marginTop: 10, marginBottom: 16 },
  diamondBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  modalDesc: { color: '#a1a1aa', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cancelText: { color: '#a1a1aa', fontSize: 15, fontWeight: '600' },
  upgradeBtn: { flex: 1.5 },
  upgradeText: { color: '#000', fontSize: 15, fontWeight: '900' },
});
