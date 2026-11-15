import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function QRScannerScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera access is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: any) => {
    if (scanned) return;
    setScanned(true);

    // Assuming the QR code contains a URL like https://luconnect.app/profile/USER_ID
    // or just the raw USER_ID. Let's extract the ID.
    const userId = data.split('/').pop();

    if (!userId || userId.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid QR Code' });
      setScanned(false);
      return;
    }

    if (userId === profile?.id) {
      Toast.show({ type: 'info', text1: 'That is your own QR code!' });
      setScanned(false);
      return;
    }

    try {
      // 1. Insert into the connections table (or follows table)
      // We will check if they are already connected first.
      const { data: existing } = await supabase
        .from('connections')
        .select('id')
        .or(`and(requester_id.eq.${profile?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${profile?.id})`)
        .maybeSingle();

      if (existing) {
        Toast.show({ type: 'info', text1: 'You are already connected with this user.' });
        navigation.goBack();
        return;
      }

      // 2. Create the connection request
      const { error } = await supabase.from('connections').insert({
        requester_id: profile?.id,
        receiver_id: userId,
        status: 'pending'
      });

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Connection request sent!' });
      navigation.goBack();

    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* OVERLAY */}
      <View style={styles.overlay}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Code</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>

        <Text style={styles.instruction}>Align the QR code within the frame to scan.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permText: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 100, paddingHorizontal: 40 },
  permBtn: { backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignSelf: 'center', marginTop: 20 },
  
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  
  scanArea: { width: 250, height: 250, alignSelf: 'center', position: 'relative' },
  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#FFD700', borderTopLeftRadius: 16 },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#FFD700', borderTopRightRadius: 16 },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#FFD700', borderBottomLeftRadius: 16 },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#FFD700', borderBottomRightRadius: 16 },
  
  instruction: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 60, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
});
