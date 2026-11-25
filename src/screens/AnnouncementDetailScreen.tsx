import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper function to parse text and style links
const renderTextWithLinks = (text: string) => {
  // Regex to find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <Text 
          key={index} 
          style={styles.linkText} 
          onPress={() => Linking.openURL(part)}
        >
          {part}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

export default function AnnouncementDetailScreen({ route, navigation }: any) {
  const { announcement } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ANNOUNCEMENT</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* BIG IMAGE */}
        <Image 
          source={require('../../assets/images/infinit_logo.png')} 
          style={styles.heroImage} 
          resizeMode="cover"
        />

        <View style={styles.content}>
          {announcement.is_pinned && (
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedText}>PINNED</Text>
            </View>
          )}

          <Text style={styles.title}>{announcement.title}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.author}>{announcement.profiles?.full_name || 'Admin'}</Text>
            <Text style={styles.date}>{new Date(announcement.published_at).toLocaleDateString()}</Text>
          </View>

          {/* USE THE HELPER FUNCTION HERE */}
          <Text style={styles.bodyText}>
            {renderTextWithLinks(announcement.description)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#000' },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },

  heroImage: { width: '100%', height: 260, backgroundColor: '#1f1f1f' },

  content: { padding: 24 },
  pinnedBadge: { alignSelf: 'flex-start', backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  pinnedText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  
  title: { fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 34, marginBottom: 12 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  author: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  date: { fontSize: 13, color: '#6d7382' },

  bodyText: { fontSize: 16, color: '#aab0bd', lineHeight: 26 },
  
  // The blue link style
  linkText: { color: '#3b82f6', textDecorationLine: 'underline', fontWeight: '600' },
});
