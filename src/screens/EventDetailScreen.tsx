import React from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

async function loadEvent(eventId: string) {
  if (!eventId) throw new Error('Missing event ID');
  const { data: event, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) throw new Error('Event not found');

  let organizer: any = null;
  let universityName = '';
  if (event.organizer_id) {
    const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, university_name, university_id').eq('id', event.organizer_id).maybeSingle();
    organizer = data;
    if (data?.university_id) {
      const { data: uni } = await supabase.from('universities').select('name, short_name').eq('id', data.university_id).maybeSingle();
      universityName = uni?.name || data.university_name || '';
    } else if (data?.university_name) {
      universityName = data.university_name;
    }
  }

  const { count } = await supabase.from('event_attendees').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
  return { event, organizer, attendeeCount: count || 0, universityName };
}

export default function EventDetailScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const queryKey = ['event', id];

  const eventQuery = useQuery({
    queryKey,
    enabled: !!id,
    staleTime: 0,
    queryFn: () => loadEvent(id),
    retry: 1,
  });

  const loading = eventQuery.isLoading;
  const event = eventQuery.data?.event || null;
  const organizer = eventQuery.data?.organizer || null;
  const attendeeCount = eventQuery.data?.attendeeCount || 0;
  const universityName = eventQuery.data?.universityName || '';
  const errorMsg = eventQuery.error?.message;
  const isOwner = event?.organizer_id === profile?.id;

  const deleteEvent = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) return Alert.alert('Error', error.message);
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['events-horizontal'] });
        navigation.goBack();
      } }
    ]);
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Ionicons name="alert-circle" size={44} color="#ef4444" />
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16 }}>Event not found</Text>
        <Text style={{ color: '#6d7382', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{errorMsg || 'This event may have been deleted or is unavailable.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 24 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event</Text>
          {isOwner ? (
            <TouchableOpacity onPress={deleteEvent} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 34 }} />
          )}
        </View>

        {/* COVER */}
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={{ width: '100%', height: 260 }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', height: 260, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar" size={60} color="#6d7382" />
          </View>
        )}

        {/* CONTENT */}
        <View style={styles.content}>
          {/* UNIVERSITY BADGE */}
          {universityName ? (
            <View style={styles.uniBadge}>
              <Ionicons name="school" size={14} color="#ef4444" />
              <Text style={styles.uniBadgeText} numberOfLines={1}>{universityName}</Text>
            </View>
          ) : null}

          {/* TITLE */}
          <Text style={styles.title}>{event.title}</Text>

          {/* INFO ROWS */}
          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar-outline" size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>DATE & TIME</Text>
                <Text style={styles.infoValue}>{new Date(event.starts_at).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}</Text>
              </View>
            </View>

            {event.location ? (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location-outline" size={16} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>LOCATION</Text>
                  <Text style={styles.infoValue}>{event.location}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="people-outline" size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>ATTENDING</Text>
                <Text style={styles.infoValue}>{attendeeCount} {attendeeCount === 1 ? 'person' : 'people'}</Text>
              </View>
            </View>
          </View>

          {/* ORGANIZER */}
          {organizer ? (
            <View style={styles.organizerBlock}>
              <Text style={styles.sectionLabel}>ORGANIZED BY</Text>
              <View style={styles.organizerRow}>
                <Image source={{ uri: organizer.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${organizer.full_name}` }} style={styles.organizerAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.organizerName}>{organizer.full_name}</Text>
                  {universityName ? <Text style={styles.organizerSub} numberOfLines={1}>{universityName}</Text> : null}
                </View>
              </View>
            </View>
          ) : null}

          {/* DESCRIPTION */}
          {event.description ? (
            <View style={styles.aboutBlock}>
              <Text style={styles.sectionLabel}>ABOUT THIS EVENT</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  uniBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1a0d0f', borderWidth: 1, borderColor: '#3b1215', marginBottom: 14 },
  uniBadgeText: { color: '#ef4444', fontSize: 12, fontWeight: '600', maxWidth: 240 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 20 },
  infoBlock: { gap: 12, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1f1f1f' },
  infoLabel: { color: '#6d7382', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  infoValue: { color: '#f2f3f5', fontSize: 14, fontWeight: '500' },
  sectionLabel: { color: '#6d7382', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  organizerBlock: { paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1f1f1f', marginBottom: 20 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  organizerAvatar: { width: 48, height: 48, borderRadius: 24 },
  organizerName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  organizerSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  aboutBlock: { paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  description: { color: '#aab0bd', fontSize: 15, lineHeight: 22 },
});
