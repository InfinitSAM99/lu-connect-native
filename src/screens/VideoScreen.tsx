import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../components/TopBar';

export default function VideoScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar 
        centeredHero 
        title="Video" 
        subtitle="Short videos and reels" 
        showBack={false} 
        centerIcon={<Ionicons name="videocam" size={72} color="#ef4444" />} 
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Ionicons name="play-circle-outline" size={80} color="#1f1f1f" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 }}>Coming Soon</Text>
        <Text style={{ fontSize: 14, color: '#6d7382', textAlign: 'center', lineHeight: 20 }}>The video feed is currently under development.</Text>
      </View>
    </View>
  );
}
