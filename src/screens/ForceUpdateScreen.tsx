import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WEBSITE_DOWNLOAD_URL = "https://lu-connect-website-sigma.vercel.app/download";

export default function ForceUpdateScreen({ apkUrl, version }: { apkUrl: string, version: string }) {
  const insets = useSafeAreaInsets();

  const openWebsite = async () => {
    try {
      const supported = await Linking.canOpenURL(WEBSITE_DOWNLOAD_URL);
      if (supported) {
        await Linking.openURL(WEBSITE_DOWNLOAD_URL);
      } else {
        Alert.alert('Error', 'Cannot open the website. Please visit lu-connect-website-sigma.vercel.app manually.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong opening the link.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Ionicons name="cloud-download" size={80} color="#ef4444" style={{ marginBottom: 24 }} />
      
      <Text style={styles.title}>UPDATE REQUIRED</Text>
      
      <Text style={styles.sub}>
        A new version of LU CONNECT ({version}) is available. You must update to continue using the app.
      </Text>
      
      <TouchableOpacity style={styles.updateBtn} onPress={openWebsite}>
        <Text style={styles.updateBtnText}>GO TO DOWNLOAD PAGE</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Tap the button above to open the website and download the latest APK.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 12, textAlign: 'center' },
  sub: { color: '#6d7382', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  updateBtn: { backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 16, width: '100%', alignItems: 'center' },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  hint: { color: '#6d7382', fontSize: 13, textAlign: 'center', marginTop: 20, lineHeight: 20 },
});
