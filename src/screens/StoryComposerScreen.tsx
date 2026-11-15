import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createStory } from '../lib/stories';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function StoryComposerScreen({ route, navigation }: any) {
  const { setIsUploadingStory } = route.params || {};
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#000000');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) setSelectedImage(res.assets[0].uri);
  };

  const publishStory = async () => {
    if (!text.trim() && !selectedImage) return Alert.alert('Error', 'Please add some content.');
    setUploading(true);
    if (setIsUploadingStory) setIsUploadingStory(true);

    try {
      let media_url = null;
      
      if (selectedImage) {
        const ext = selectedImage.split('.').pop();
        const path = `${profile?.id}/story-${Date.now()}.${ext}`;
        const blob = await (await fetch(selectedImage)).blob();
        const { error: uploadError } = await supabase.storage.from('stories').upload(path, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(path);
        media_url = publicUrl;
      }

      await createStory({
        story_type: selectedImage ? 'image' : 'text',
        media_url: media_url,
        text_content: text,
        background_color: bgColor,
        audience: 'friends',
      }, profile!.id);

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
      if (setIsUploadingStory) setIsUploadingStory(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topToolbar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.toolBtn}><Ionicons name="musical-notes" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn}><Ionicons name="sparkles" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn}><Ionicons name="happy-outline" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn}><Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Aa</Text></TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn}><Ionicons name="scan-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <View style={styles.editor}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.media} />
        ) : (
          <View style={[styles.media, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your story..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              multiline
              value={text}
              onChangeText={setText}
            />
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
          <Ionicons name="image" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={publishStory} disabled={uploading} style={styles.publishBtn}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Your story</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topToolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10 },
  toolBtn: { padding: 10 },
  editor: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },
  media: { width: '100%', height: '100%', resizeMode: 'cover' },
  textInput: { color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center', padding: 20, width: '100%' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  publishBtn: { flex: 1, marginHorizontal: 10, backgroundColor: '#141414', paddingVertical: 14, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#3f3f3f' },
});
