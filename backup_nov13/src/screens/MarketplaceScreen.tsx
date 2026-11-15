import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Image, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 16 * 2 - 12) / 2;

const CATEGORIES = ['all', 'books', 'electronics', 'fashion', 'food', 'furniture', 'services', 'other'];

async function loadMarketplace() {
  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*, profiles:seller_id(id, full_name, avatar_url, is_verified)')
    .eq('is_sold', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Marketplace load error:', error.message);
    throw error;
  }
  console.log('Marketplace loaded items:', data?.length);
  return data || [];
}

export default function MarketplaceScreen({ navigation }: any) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Compose state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState(profile?.mobile_number || '');
  const [category, setCategory] = useState('books');
  const [condition, setCondition] = useState('used');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['marketplace'],
    enabled: !!profile,
    queryFn: () => loadMarketplace(),
  });

  React.useEffect(() => {
    const s = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const h = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  const filtered = (items || []).filter(i => activeCategory === 'all' || i.category === activeCategory);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setPrice(''); setImageUri(null); setErr('');
    setPhone(profile?.mobile_number || '');
  };

  const submit = async () => {
    if (!title.trim()) return setErr('Title is required');
    if (!price.trim() || isNaN(Number(price))) return setErr('Enter a valid price');
    if (!imageUri) return setErr('Please add a photo');

    setSubmitting(true); setErr('');
    try {
      // Upload image
      const ext = imageUri.split('.').pop() || 'jpg';
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from('marketplace').upload(path, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('marketplace').getPublicUrl(path);

      // Insert row
      const { error: insertErr } = await supabase.from('marketplace_items').insert({
        seller_id: profile.id,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        condition,
        image_url: publicUrl,
        location: profile.location || profile.residence || null,
        phone_number: phone.trim() || null,
        university_id: profile.university_id,
      });
      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      resetForm();
      setComposerOpen(false);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        hero
        title="Marketplace"
        subtitle="Buy & sell within your campus"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={
          <FastButton style={styles.sellBtn} onPress={() => setComposerOpen(true)}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 4 }}>Sell</Text>
          </FastButton>
        }
      />

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        {CATEGORIES.map(c => (
          <FastButton
            key={c}
            style={[styles.chip, activeCategory === c && styles.chipActive]}
            onPress={() => setActiveCategory(c)}
          >
            <Text style={[styles.chipText, activeCategory === c && { color: '#fff' }]}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Text>
          </FastButton>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color="#ef4444" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="cart-outline" size={60} color="#6d7382" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>Nothing for sale yet</Text>
          <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 6, textAlign: 'center' }}>Be the first to list something on campus!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <FastButton style={styles.card} onPress={() => navigation.navigate('MarketplaceItem', { item })}>
              <Image source={{ uri: item.image_url }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={styles.cardPrice}>KSh {Number(item.price).toLocaleString()}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.condition === 'new' ? '✨ New' : item.condition === 'refurbished' ? '♻️ Refurb' : '📦 Used'}
                  {item.location ? ` · ${item.location}` : ''}
                </Text>
              </View>
            </FastButton>
          )}
        />
      )}

      {/* Sell Modal */}
      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingBottom: keyboardHeight }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Sell an item</Text>
                <FastButton onPress={() => setComposerOpen(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </FastButton>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <FastButton style={styles.imagePicker} onPress={pickImage}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={36} color="#6d7382" />
                      <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 8 }}>Add a photo</Text>
                    </>
                  )}
                </FastButton>

                {err ? <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{err}</Text> : null}

                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. iPhone 13, 128GB" placeholderTextColor="#6d7382" />

                <Text style={[styles.label, { marginTop: 12 }]}>Price (KSh)</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="e.g. 45000" placeholderTextColor="#6d7382" keyboardType="numeric" />

                <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {CATEGORIES.filter(c => c !== 'all').map(c => (
                    <FastButton key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                      <Text style={[styles.chipText, category === c && { color: '#fff' }]}>{c}</Text>
                    </FastButton>
                  ))}
                </ScrollView>

                <Text style={[styles.label, { marginTop: 12 }]}>Condition</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['new', 'used', 'refurbished'].map(c => (
                    <FastButton key={c} style={[styles.chip, condition === c && styles.chipActive]} onPress={() => setCondition(c)}>
                      <Text style={[styles.chipText, condition === c && { color: '#fff' }]}>{c}</Text>
                    </FastButton>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Condition, specs, etc." placeholderTextColor="#6d7382" />

                <Text style={[styles.label, { marginTop: 12 }]}>Phone number (for buyers)</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="e.g. 07XX XXX XXX" placeholderTextColor="#6d7382" keyboardType="phone-pad" />

                <FastButton style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={submit} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Publish Listing</Text>}
                </FastButton>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sellBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#141414', borderWidth: 1, borderColor: '#1f1f1f' },
  chipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipText: { color: '#6d7382', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  card: { width: CARD_W, backgroundColor: '#0a0a0a', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#1f1f1f' },
  cardImage: { width: '100%', height: CARD_W, backgroundColor: '#141414' },
  cardBody: { padding: 10 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: '#ef4444' },
  cardTitle: { fontSize: 13, color: '#fff', marginTop: 2, lineHeight: 17 },
  cardMeta: { fontSize: 11, color: '#6d7382', marginTop: 4 },
  imagePicker: { height: 200, borderRadius: 14, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 },
  label: { fontSize: 12, color: '#6d7382', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15 },
  submitBtn: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
});
