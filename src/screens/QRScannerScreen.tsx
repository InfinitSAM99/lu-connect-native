import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import Toast from 'react-native-toast-message';
import { tapLight, tapHeavy } from '../lib/haptics';

export default function QRScannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const handleQRData = async (data: string) => {
    if (scanned || !profile?.id) return;
    setScanned(true);
    tapLight();

    const targetUserId = data.split('/').pop();

    if (!targetUserId || targetUserId.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid QR', text2: 'This is not a LU Connect QR code.' });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    if (targetUserId === profile.id) {
      Toast.show({ type: 'info', text1: 'Your QR Code', text2: 'You scanned your own code!' });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    setLoading(true);
    try {
      const { data: existingFollow } = await supabase.from('follows').select('id').eq('follower_id', profile.id).eq('following_id', targetUserId).maybeSingle();

      if (!existingFollow) {
        await supabase.from('follows').insert({ follower_id: profile.id, following_id: targetUserId });
        Toast.show({ type: 'success', text1: 'Following!', text2: 'You are now following this user.' });
      } else {
        Toast.show({ type: 'info', text1: 'Already Following' });
      }

      setTimeout(() => { navigation.replace('Profile', { id: targetUserId }); }, 1000);
    } catch (e: any) {
      tapHeavy();
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    tapLight();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0].uri) {
      try {
        const scannedResults = await Camera.scanFromURLAsync(result.assets[0].uri, ['qr']);
        if (scannedResults && scannedResults.length > 0) handleQRData(scannedResults[0].data);
        else Toast.show({ type: 'error', text1: 'No QR Code' });
      } catch (e: any) { Toast.show({ type: 'error', text1: 'Scan Failed', text2: e.message }); }
    }
  };

  if (!permission?.granted) return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#FFD700" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Scan QR Code" showBack={true} onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, position: 'relative' }}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : ({ data }) => handleQRData(data)} />
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} /><View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.bottomContent}>
              {loading ? <ActivityIndicator color="#FFD700" size="large" /> : (
                <>
                  <Text style={styles.instruction}>Point your camera at a LU Connect QR code.</Text>
                  <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}><Ionicons name="images" size={24} color="#fff" /><Text style={styles.galleryBtnText}>Upload from Gallery</Text></TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const frameSize = 260;
const styles = StyleSheet.create({
  overlay: { flex: 1 }, topOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }, middleRow: { flexDirection: 'row', height: frameSize }, sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  scanFrame: { width: frameSize, height: frameSize, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#FFD700', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 }, topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 }, bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 }, bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  bottomOverlay: { flex: 1, justifyContent: 'flex-end', paddingBottom: 60, paddingHorizontal: 24 }, bottomContent: { alignItems: 'center', gap: 24 },
  instruction: { color: '#a1a1aa', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  galleryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
