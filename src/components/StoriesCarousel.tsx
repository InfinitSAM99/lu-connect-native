import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export function StoriesCarousel({ myStories, friendsStories, onOpenMyStory, onOpenFriendStory, onAddStory, isUploading }: any) {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* MY STORY */}
        <TouchableOpacity 
          style={styles.storyItem} 
          onPress={myStories?.length > 0 ? onOpenMyStory : onAddStory}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            {isUploading ? (
              <View style={styles.uploadingRing}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : myStories?.length > 0 ? (
              <LinearGradient colors={['#ef4444', '#FFD700']} style={styles.ringGradient}>
                <Image source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name}` }} style={styles.avatarImage} />
              </LinearGradient>
            ) : (
              <>
                <View style={styles.ringGrey}>
                  <Image source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name}` }} style={styles.avatarImage} />
                </View>
                <View style={styles.plusBadge}>
                  <Ionicons name="add" size={14} color="#fff" />
                </View>
              </>
            )}
          </View>
          <Text style={styles.storyName} numberOfLines={1}>{isUploading ? 'Uploading...' : 'Your Story'}</Text>
        </TouchableOpacity>

        {/* FRIENDS' STORIES */}
        {friendsStories?.map((userStories: any) => {
          const user = userStories[0].profiles;
          const hasUnseen = userStories.some((s: any) => !s.has_viewed);
          
          return (
            <TouchableOpacity 
              key={userStories[0].user_id} 
              style={styles.storyItem} 
              onPress={() => onOpenFriendStory(userStories)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarWrapper}>
                {hasUnseen ? (
                  <LinearGradient colors={['#ef4444', '#FFD700']} style={styles.ringGradient}>
                    <Image source={{ uri: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}` }} style={styles.avatarImage} />
                  </LinearGradient>
                ) : (
                  <View style={styles.ringGrey}>
                    <Image source={{ uri: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}` }} style={styles.avatarImage} />
                  </View>
                )}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{user.full_name.split(' ')[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  scrollContent: { paddingHorizontal: 16, gap: 14 },
  storyItem: { alignItems: 'center', width: 74 },
  avatarWrapper: { position: 'relative', width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  ringGradient: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  ringGrey: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
  uploadingRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59,130,246,0.2)' },
  avatarImage: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#000' },
  plusBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#ef4444', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  storyName: { color: '#fff', fontSize: 11, fontWeight: '500', marginTop: 6, textAlign: 'center' },
});
