import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

export default function ForceUpdateScreen({ apkUrl, version }: { apkUrl: string, version: string }) {
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadAndInstall = async () => {
    if (!apkUrl) return Alert.alert('Error', 'No APK file available.');
    
    setDownloading(true);
    const fileUri = FileSystem.documentDirectory + 'lu-connect-update.apk';

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        apkUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progressPercent = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setProgress(progressPercent * 100);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result) throw new Error('Download failed');

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        
        try {
          // Try to open the installer directly
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
          });
        } catch (installError) {
          // If it fails (Permission Denied), send them to the App Info Settings page
          Alert.alert(
            'Permission Required',
            'To install the update, you need to allow "Install Unknown Apps" in the settings. We will open the settings for you.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
                  data: 'package:' + Application.applicationId
                })
              }
            ]
          );
        }
      }
      
      setDownloading(false);
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
      setDownloading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Ionicons name="cloud-download" size={80} color="#ef4444" style={{ marginBottom: 24 }} />
      <Text style={styles.title}>UPDATE REQUIRED</Text>
      <Text style={styles.sub}>
        A new version of LU CONNECT ({version}) is available. You must update to continue using the app.
      </Text>
      {downloading ? (
        <View style={styles.progressWrap}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.progressText}>Downloading... {Math.round(progress)}%</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.updateBtn} onPress={downloadAndInstall}>
          <Text style={styles.updateBtnText}>DOWNLOAD & INSTALL</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 12, textAlign: 'center' },
  sub: { color: '#6d7382', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  updateBtn: { backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 16, width: '100%', alignItems: 'center' },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  progressWrap: { alignItems: 'center', gap: 16 },
  progressText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
