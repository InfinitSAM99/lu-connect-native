import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ForceAvatarModal() {
  const { profile, setProfile, reloadProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  // If no profile, or they already have an avatar, don't show this.
  if (!profile || profile.avatar_required === false) return null;

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (res.canceled) return;

    setUploading(true);
    try {
      const uri = res.assets[0].uri;
      const ext = uri.split('.').pop() || 'jpg';
      const path = `avatars/${profile.id}-${Date.now()}.${ext}`;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      
      // Save to DB
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (dbErr) throw dbErr;

      // Update local state so the modal disappears immediately
      setProfile({ ...profile, avatar_url: publicUrl });
      reloadProfile?.();
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="camera" size={40} color="#ef4444" />
        </View>
        
        <Text style={styles.title}>One last step</Text>
        <Text style={styles.subtitle}>
          Please upload a profile picture so other students can recognize you on LU CONNECT.
        </Text>

        <TouchableOpacity onPress={pickAvatar} disabled={uploading} style={styles.btn}>
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="image" size={20} color="#fff" />
              <Text style={styles.btnText}>Upload Photo</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>This is required to use the app.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 24,
  },
  card: { width: '100%', alignItems: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#1a0d0f',
    borderWidth: 2, borderColor: '#3b1215',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subtitle: { color: '#6d7382', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ef4444', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 32, width: '100%',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { color: '#3b1215', fontSize: 12, marginTop: 16 },
});
