import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

export default function HallOfFameScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const { data: leaders, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#E5C07B" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerLogo}>LU CONNECT</Text>
        <Text style={styles.headerTitle}>HALL OF FAME</Text>
        <TouchableOpacity style={[styles.settingsButton, { top: insets.top + 10 }]}>
          <Ionicons name="settings-sharp" size={24} color="#444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {(!leaders || leaders.length === 0) && (
          <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>
            No winners announced yet.
          </Text>
        )}

        {leaders?.map((item: any, index: number) => {
          const rankLabel = index === 0 ? '#1 WINNER OF THE YEAR' : `#${index + 1}`;
          const imageUri = item.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.full_name}`;
          const nameParts = (item.full_name || '').split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

          return (
            <View key={item.id || index} style={styles.card}>
              <Image source={{ uri: imageUri }} style={styles.backgroundImage} />
              <View style={styles.darkTint} />

              {/* Top gradient */}
              <LinearGradient colors={['#000', 'rgba(0,0,0,0.8)', 'transparent']} locations={[0, 0.3, 0.6]} style={styles.topGradient} />

              {/* Bottom gradient */}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', '#000']} locations={[0.4, 0.8, 1]} style={styles.bottomGradient} />

              {/* Left gradient */}
              <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.leftGradient} />

              {/* Right gradient */}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']} locations={[0, 0.6, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.rightGradient} />

              {/* Rank Badge */}
              <View style={styles.awardBadge}>
                <Ionicons name="trophy" size={12} color="#000" />
                <Text style={styles.awardText}>{rankLabel}</Text>
              </View>

              {/* Bottom Info */}
              <View style={styles.bottomInfo}>
                <Text style={styles.firstName}>{firstName}</Text>
                {lastName ? <Text style={styles.lastName}>{lastName.toUpperCase()}</Text> : null}
                <View style={styles.extraDataContainer}>
                  <Text style={styles.university}>{item.university_name || 'LU Connect Student'}</Text>
                  <Text style={styles.stat}>
                    {item.followers || 0} Followers · {item.likes || 0} Likes · Score {item.total_score || 0}
                  </Text>
                </View>
              </View>

              {/* Arrow */}
              <TouchableOpacity style={styles.arrowButton}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', paddingBottom: 20, position: 'relative' },
  headerLogo: { color: '#a09d85', fontSize: 12, letterSpacing: 4, fontWeight: '500', marginBottom: 6 },
  headerTitle: { color: '#E5C07B', fontSize: 26, fontWeight: '600', letterSpacing: 1 },
  settingsButton: { position: 'absolute', right: 20, padding: 8 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  card: {
    width: '100%',
    height: SCREEN_W * 1.35,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  backgroundImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  darkTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  leftGradient: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%' },
  rightGradient: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '40%' },

  awardBadge: {
    position: 'absolute',
    top: 20,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5C07B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  awardText: { color: '#000', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  bottomInfo: { position: 'absolute', bottom: 35, left: 24, right: 70 },
  firstName: { color: '#fff', fontSize: 34, fontStyle: 'italic', fontWeight: '400', marginBottom: -8, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  lastName: { color: '#fff', fontSize: 34, fontWeight: '700', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },

  extraDataContainer: { marginTop: 16 },
  university: { color: '#E5C07B', fontSize: 13, fontWeight: '600', marginTop: 2 },
  stat: { color: '#8892A4', fontSize: 12, marginTop: 4 },

  arrowButton: { position: 'absolute', bottom: 35, right: 20, width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
});
