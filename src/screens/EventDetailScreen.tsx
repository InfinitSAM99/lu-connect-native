import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

async function loadEvent(eventId: string) {
  const [eventRes, attendeesRes] = await Promise.all([
    supabase.from('events').select('*, profiles:organizer_id(id, full_name, avatar_url)').eq('id', eventId).single(),
    supabase.from('event_attendees').select('status, profiles:user_id(id, full_name, avatar_url)').eq('event_id', eventId),
  ]);
  if (eventRes.error) throw new Error(eventRes.error.message);
  return { event: eventRes.data, attendees: (attendeesRes.data || []).filter((a) => a.profiles) };
}

export default function EventDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const queryKey = ['event', id];
  const eventQuery = useQuery({ queryKey, enabled: !!id, staleTime: 60000, queryFn: () => loadEvent(id) });

  const event = eventQuery.data?.event || null;
  const attendees = eventQuery.data?.attendees || [];
  const loading = eventQuery.isLoading;

  const rsvp = async (status: string) => {
    await supabase.from('event_attendees').upsert({ event_id: id, user_id: profile.id, status });
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#ef4444" /></View>;
  if (!event) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff' }}>Event not found</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Event Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {event.image_url && <Image source={{ uri: event.image_url }} style={{ width: '100%', height: 240 }} />}
        
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 }}>{event.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="calendar" size={16} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>{new Date(event.starts_at).toLocaleString()}</Text>
          </View>
          {event.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="location" size={16} color="#aab0bd" />
              <Text style={{ color: '#aab0bd', fontSize: 14 }}>{event.location}</Text>
            </View>
          )}
          {event.description && (
            <Text style={{ fontSize: 14, color: '#aab0bd', lineHeight: 22, marginBottom: 16 }}>{event.description}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.pillPrimary} onPress={() => rsvp('going')}>
              <Text style={styles.pillPrimaryText}>Going</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillGhost} onPress={() => rsvp('interested')}>
              <Text style={styles.pillGhostText}>Interested</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 12 }}>Attendees ({attendees.length})</Text>
          {attendees.map((a: any) => (
            <View key={a.profiles.id} style={styles.attendeeRow}>
              <Image source={{ uri: a.profiles.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${a.profiles.full_name}` }} style={{ width: 36, height: 36, borderRadius: 18 }} />
              <Text style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 12 }}>{a.profiles.full_name}</Text>
              <Text style={{ fontSize: 12, color: '#6d7382', textTransform: 'capitalize' }}>{a.status}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  pillPrimary: { backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  pillPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pillGhost: { borderWidth: 1.5, borderColor: '#1f1f1f', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  pillGhostText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
});
