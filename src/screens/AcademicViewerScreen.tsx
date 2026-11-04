import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';

export default function AcademicViewerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { url, type, title } = route.params;

  // Video player setup
  const player = useVideoPlayer(type === 'video' || type === 'audio' ? url : null, (player) => {
    if (type === 'video' || type === 'audio') {
      player.play();
    }
  });

  const openExternal = () => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No app found to open this file.'));
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Viewer'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {type === 'pdf' ? (
          <WebView
            source={{ 
              html: `
                <html>
                  <body style="margin:0;padding:0;background-color:#111;">
                    <iframe 
                      src="https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true" 
                      width="100%" 
                      height="100%" 
                      style="border:none;">
                    </iframe>
                  </body>
                </html>
              ` 
            }}
            style={{ flex: 1, backgroundColor: '#111' }}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            renderLoading={() => (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#ef4444" />
              </View>
            )}
          />
        ) : type === 'video' ? (
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
          />
        ) : type === 'audio' ? (
          <View style={styles.centerBox}>
            <Ionicons name="musical-notes" size={80} color="#a855f7" style={{ marginBottom: 24 }} />
            <Text style={styles.title}>Audio Lecture</Text>
            <Text style={styles.sub}>Listen to this recording directly in the app.</Text>
            <View style={{ width: 0, height: 0 }}>
              <VideoView player={player} style={{ width: 0, height: 0 }} />
            </View>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#a855f7' }]} onPress={() => player.play()}>
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.actionText}>PLAY AUDIO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.centerBox}>
            <Text style={{ color: '#6d7382' }}>Unsupported file type.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { flex: 1, backgroundColor: '#000' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { color: '#6d7382', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  video: { flex: 1, width: '100%', height: '100%' },
});
