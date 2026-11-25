import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WEBSITE_DOWNLOAD_URL = "https://lu-connect-website-sigma.vercel.app/download";

interface ForceUpdateScreenProps {
  apkUrl?: string;
  version?: string;
  isForced?: boolean;
  onDismiss?: () => void;
}

export default function ForceUpdateScreen({
  apkUrl,
  version,
  isForced = true,
  onDismiss,
}: ForceUpdateScreenProps) {
  const insets = useSafeAreaInsets();
  const targetUrl = apkUrl && apkUrl.trim() ? apkUrl.trim() : WEBSITE_DOWNLOAD_URL;

  const openWebsite = async () => {
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        Alert.alert('Error', 'Cannot open the download page. Please visit lu-connect-website-sigma.vercel.app manually.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong opening the link.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Ionicons
        name="cloud-download"
        size={80}
        color={isForced ? '#ef4444' : '#3b82f6'}
        style={{ marginBottom: 24 }}
      />

      <Text style={styles.title}>
        {isForced ? 'UPDATE REQUIRED' : 'UPDATE AVAILABLE'}
      </Text>

      <Text style={styles.sub}>
        {isForced
          ? `A new version of LU CONNECT (${version || 'latest'}) is available. You must update to continue using the app.`
          : `A new version of LU CONNECT (${version || 'latest'}) is available. You can update now or continue using the current version.`}
      </Text>

      <TouchableOpacity
        style={[styles.updateBtn, !isForced && styles.optionalUpdateBtn]}
        onPress={openWebsite}
      >
        <Text style={styles.updateBtnText}>GO TO DOWNLOAD PAGE</Text>
      </TouchableOpacity>

      {!isForced && onDismiss ? (
        <TouchableOpacity style={styles.laterBtn} onPress={onDismiss}>
          <Text style={styles.laterBtnText}>MAYBE LATER</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.hint}>
        Tap the button above to open the download page and get the latest APK.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 12, textAlign: 'center' },
  sub: { color: '#6d7382', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  updateBtn: { backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 16, width: '100%', alignItems: 'center' },
  optionalUpdateBtn: { backgroundColor: '#2563eb' },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  laterBtn: { marginTop: 14, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#2a2d35' },
  laterBtnText: { color: '#cbd5e1', fontSize: 14, fontWeight: '700', letterSpacing: 1.2 },
  hint: { color: '#6d7382', fontSize: 13, textAlign: 'center', marginTop: 20, lineHeight: 20 },
});
