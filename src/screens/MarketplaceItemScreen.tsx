import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';
import VerifiedBadge from '../components/VerifiedBadge';

export default function MarketplaceItemScreen({ route, navigation }: any) {
  const { item } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const isMine = item.seller_id === profile?.id;
  const seller = item.profiles;

  const startChat = async () => {
    try {
      // Use the create_dm RPC we already have
      const { data: convId, error } = await supabase.rpc('create_dm', { other_user_id: item.seller_id });
      if (error || !convId) throw new Error(error?.message || 'Could not open chat');

      // Navigate to the conversation, and pass an optional draft message
      navigation.navigate('Conversation', {
        id: convId,
        draft: `Hi, is the "${item.title}" still available?`,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const callSeller = async () => {
    if (!item.phone_number) {
      Alert.alert('No phone number', 'This seller did not provide a phone number.');
      return;
    }
    const url = `tel:${item.phone_number}`;
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else Alert.alert('Error', 'Cannot open phone dialer.');
  };

  const markSold = async () => {
    Alert.alert('Mark as sold', 'Mark this item as sold?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('marketplace_items').update({ is_sold: true }).eq('id', item.id);
          if (error) return Alert.alert('Error', error.message);
          queryClient.invalidateQueries({ queryKey: ['marketplace'] });
          navigation.goBack();
        }
      }
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Listing" showBack={true} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 340, backgroundColor: '#141414' }} />

        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#ef4444' }}>KSh {Number(item.price).toLocaleString()}</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 8 }}>{item.title}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.condition === 'new' ? '✨ Brand new' : item.condition === 'refurbished' ? '♻️ Refurbished' : '📦 Used'}</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View>
            {item.location ? <View style={styles.badge}><Text style={styles.badgeText}>📍 {item.location}</Text></View> : null}
          </View>

          {item.description ? (
            <Text style={{ fontSize: 15, color: '#aab0bd', lineHeight: 22, marginTop: 20 }}>{item.description}</Text>
          ) : null}

          {/* Seller card */}
          <View style={styles.sellerCard}>
            <Image source={{ uri: seller?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${seller?.full_name}` }} style={styles.sellerAvatar} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: '#6d7382', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Seller</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{seller?.full_name || 'Student'}</Text>
                {seller?.is_verified && <VerifiedBadge size={14} />}
              </View>
            </View>
            <FastButton onPress={() => navigation.navigate('Profile', { id: item.seller_id })}>
              <Ionicons name="chevron-forward" size={20} color="#6d7382" />
            </FastButton>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isMine ? (
          <FastButton style={styles.soldBtn} onPress={markSold}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 8 }}>Mark as Sold</Text>
          </FastButton>
        ) : (
          <>
            <FastButton style={styles.callBtn} onPress={callSeller}>
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 6 }}>Call</Text>
            </FastButton>
            <FastButton style={styles.chatBtn} onPress={startChat}>
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 6 }}>Chat Seller</Text>
            </FastButton>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: '#141414', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: '#aab0bd', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', padding: 14, borderRadius: 14, marginTop: 24 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, backgroundColor: 'rgba(0,0,0,0.95)', borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  callBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: '#1f1f1f' },
  chatBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: '#ef4444' },
  soldBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: '#22c55e' },
});
