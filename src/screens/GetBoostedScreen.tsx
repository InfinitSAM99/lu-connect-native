import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';
import BottomSheet from '../components/BottomSheet';

const MPESA_NUMBER = '0725303245';
const MPESA_NAME = 'Samuel Mugasia';

function BoostSheet({ open, mode, onClose, onSubmitted }: any) {
  const { profile } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [category, setCategory] = useState('likes');
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [phone, setPhone] = useState(profile?.mobile_number || '');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedPost(null);
      setSelectedPackage(null);
      setPhone(profile?.mobile_number || '');
      setErrMsg('');
      setMsg('');
      (async () => {
        setLoadingPkgs(true);
        const { data } = await supabase
          .from('boost_packages')
          .select('id, label, description, category, amount_ksh, duration_days, quantity, unit, delivery_days, icon, sort_order')
          .eq('active', true)
          .order('sort_order');
        setPackages(data || []);
        setLoadingPkgs(false);
      })();
    }
  }, [open, profile?.mobile_number]);

  useEffect(() => {
    if (open && mode === 'post') {
      (async () => {
        const { data } = await supabase
          .from('posts')
          .select('id, content, created_at')
          .eq('author_id', profile?.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(20);
        setMyPosts(data || []);
      })();
    }
  }, [open, mode, profile?.id]);

  const canSubmit = !!selectedPackage && (mode === 'followers' || !!selectedPost) && phone.trim().replace(/\D/g, '').length >= 10;

  const submit = async () => {
    setErrMsg(''); setMsg('');
    const cleanedPhone = phone.trim().replace(/\D/g, '');
    if (cleanedPhone.length < 10) return setErrMsg('Enter a valid M-Pesa phone number (e.g. 0712345678).');

    // If this is a post boost, block duplicate active boosts on the same post
    if (mode === 'post' && selectedPost) {
      const { data: existing } = await supabase
        .from('payments')
        .select('id, status, metadata')
        .eq('user_id', profile.id)
        .eq('purpose', 'post_boost')
        .in('status', ['pending', 'approved'])
        .contains('metadata', { post_id: selectedPost.id });

      if (existing && existing.length > 0) {
        return setErrMsg('This post already has an active or pending boost. Wait for it to finish before boosting again.');
      }
    }
    
    setSubmitting(true);
    const isFollower = mode === 'followers';
    const purpose = isFollower ? 'followers' : 'post_boost';
    const metadata = isFollower
      ? { followers: selectedPackage.quantity, package_id: selectedPackage.id, category: 'followers' }
      : { post_id: selectedPost.id, package_id: selectedPackage.id, category: selectedPackage.category, quantity: selectedPackage.quantity, duration_days: selectedPackage.duration_days };

    try {
      const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
        body: {
          phone: cleanedPhone,
          amount: selectedPackage.amount_ksh,
          purpose,
          user_id: profile.id,
          metadata,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMsg('STK Push sent. Enter your M-Pesa PIN to complete payment.');
      setSelectedPackage(null); 
      setSelectedPost(null); 
      setPhone(profile?.mobile_number || '');
      onSubmitted?.();
      setTimeout(() => onClose(), 3000);
    } catch (e: any) {
      setErrMsg('Payment failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const visiblePackages = packages.filter((p) => p.category === category);
  const amount = selectedPackage?.amount_ksh || 0;

  if (!open) return null;

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="92vh">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
            {mode === 'followers' ? 'Grow Followers' : 'Boost Post'}
          </Text>
          <FastButton onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </FastButton>
        </View>

        {/* PACKAGES */}
        <Text style={styles.sectionLabel}>CHOOSE A PACKAGE</Text>
        {loadingPkgs ? (
          <ActivityIndicator color="#ef4444" style={{ margin: 20 }} />
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {visiblePackages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => setSelectedPackage(pkg)}
                  style={[styles.packageRow, isSelected && styles.packageRowSelected]}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.packageTitle, isSelected && { color: '#fff' }]}>{pkg.label}</Text>
                    <Text style={styles.packageSub}>{pkg.description}</Text>
                  </View>
                  <Text style={[styles.packagePrice, isSelected && { color: '#fff' }]}>KSh {pkg.amount_ksh}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* POST PICKER (if mode=post) */}
        {mode === 'post' && selectedPackage && (
          <>
            <Text style={styles.sectionLabel}>CHOOSE POST TO BOOST</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 20 }}>
              {myPosts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedPost(p)}
                  style={[styles.postCard, selectedPost?.id === p.id && styles.postCardSelected]}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={3}>{p.content || '(no text)'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* PAYMENT SUMMARY */}
        {selectedPackage && (mode === 'followers' || selectedPost) && (
          <View style={styles.summaryBox}>
            <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>M-Pesa Number</Text>
              <Text style={styles.summaryValue}>{MPESA_NUMBER}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Name</Text>
              <Text style={styles.summaryValue}>{MPESA_NAME}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444', fontWeight: '800', fontSize: 18 }]}>KSh {amount}</Text>
            </View>
          </View>
        )}

        {/* INPUT + SUBMIT */}
        {selectedPackage && (mode === 'followers' || selectedPost) && (
          <>
            <Text style={styles.label}>Your M-Pesa Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="07XX XXX XXX"
              placeholderTextColor="#6d7382"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {errMsg ? <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 14 }}>{errMsg}</Text> : null}
            {msg ? <Text style={{ color: '#22c55e', fontSize: 13, marginTop: 14 }}>{msg}</Text> : null}

            <FastButton
              onPress={submit}
              disabled={!canSubmit || submitting}
              style={{ backgroundColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, opacity: (!canSubmit || submitting) ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {submitting ? 'Sending prompt...' : `Pay KSh ${amount} via M-Pesa`}
              </Text>
            </FastButton>
            <Text style={{ color: '#6d7382', fontSize: 11, textAlign: 'center', marginTop: 12 }}>An M-Pesa PIN prompt will be sent to your phone.</Text>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

export default function GetBoostedScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState('post');
  const [payments, setPayments] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('payments')
      .select('id, purpose, amount, mpesa_code, status, metadata, created_at')
      .eq('user_id', profile.id)
      .in('purpose', ['followers', 'post_boost'])
      .order('created_at', { ascending: false })
      .limit(30);

    // Fetch thumbnails for post boosts
    const postIds = (data || []).map((p: any) => p.metadata?.post_id).filter(Boolean);
    let postMap: any = {};
    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, post_media(media_url)')
        .in('id', postIds);
      (posts || []).forEach((p: any) => { postMap[p.id] = p; });
    }

    const enriched = (data || []).map((p: any) => ({
      ...p,
      _post: p.metadata?.post_id ? postMap[p.metadata.post_id] : null,
    }));
    setPayments(enriched);
  };

  useEffect(() => { load(); }, [profile?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar title="Boost" showBack={true} onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Ionicons name="rocket" size={60} color="#ef4444" />
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>Get more eyes on your content</Text>
          <Text style={{ color: '#6d7382', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 30 }}>Boost a post to reach more students, or grow your follower count faster with a package.</Text>
        </View>

        <FastButton onPress={() => { setSheetMode('post'); setSheetOpen(true); }} style={{ backgroundColor: '#ef4444', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          <Ionicons name="flame" size={24} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Boost a post</Text>
        </FastButton>

        <FastButton onPress={() => { setSheetMode('followers'); setSheetOpen(true); }} style={{ backgroundColor: '#ef4444', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="people" size={24} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Grow my followers</Text>
        </FastButton>

        {/* HISTORY */}
        <TouchableOpacity onPress={() => setHistoryOpen(!historyOpen)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Boost history</Text>
          <Ionicons name={historyOpen ? "chevron-up" : "chevron-down"} size={20} color="#6d7382" />
        </TouchableOpacity>

        {historyOpen && payments.length === 0 && (
          <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 20 }}>No boosts yet.</Text>
        )}

        {historyOpen && payments.map((p) => (
          <View
            key={p.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#0a0a0a',
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: '#1f1f1f',
              gap: 12,
            }}
          >
            {/* Post thumbnail (for post boosts) OR followers icon */}
            <View style={styles.boostThumbWrap}>
              {p._post?.post_media?.[0]?.media_url ? (
                <Image source={{ uri: p._post.post_media[0].media_url }} style={styles.boostThumb} />
              ) : (
                <View style={styles.boostThumb}>
                  <Ionicons
                    name={p.purpose === 'followers' ? 'people' : 'flame'}
                    size={22}
                    color="#ef4444"
                  />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                {p.purpose === 'followers'
                  ? `+${p.metadata?.followers || 0} followers`
                  : `${p.metadata?.quantity ? '+' : ''}${p.metadata?.quantity || 0} ${p.metadata?.category || 'boosts'}`}
              </Text>
              <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                {p._post?.content ? `"${p._post.content.slice(0, 40)}${p._post.content.length > 40 ? '…' : ''}"` : (p.purpose === 'followers' ? 'Follower growth' : 'Post boost')}
              </Text>
              <Text style={{ color: '#6d7382', fontSize: 11, marginTop: 4 }}>
                {p.mpesa_code ? `${p.mpesa_code} · ` : ''}{new Date(p.created_at).toLocaleDateString()}
              </Text>
            </View>
            <StatusBadge status={p.status} />
          </View>
        ))}
      </ScrollView>

      <BoostSheet
        open={sheetOpen}
        mode={sheetMode}
        onClose={() => setSheetOpen(false)}
        onSubmitted={() => { load(); queryClient.invalidateQueries({ queryKey: ['payments'] }); }}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  let style = { bg: '#141414', color: '#aab0bd', label: 'PENDING' };
  if (status === 'approved' || status === 'paid') style = { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'APPROVED' };
  else if (status === 'rejected' || status === 'failed') style = { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'FAILED' };
  else if (status === 'cancelled') style = { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'CANCELLED' };

  return (
    <View style={{ backgroundColor: style.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: style.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { color: '#6d7382', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  packageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1f1f1f', gap: 12 },
  packageRowSelected: { borderColor: '#ef4444', backgroundColor: '#1a0d0f' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#6d7382', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#ef4444' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  packageTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  packageSub: { color: '#6d7382', fontSize: 12, marginTop: 2 },
  packagePrice: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  postCard: { width: 140, height: 100, borderRadius: 12, backgroundColor: '#141414', padding: 12, borderWidth: 1, borderColor: '#1f1f1f' },
  postCardSelected: { borderColor: '#ef4444', backgroundColor: '#1a0d0f' },
  summaryBox: { backgroundColor: '#0a0a0a', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1f1f1f' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  summaryLabel: { color: '#6d7382', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  label: { color: '#6d7382', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  boostThumbWrap: { width: 54, height: 54, borderRadius: 12, overflow: 'hidden', backgroundColor: '#141414', borderWidth: 1, borderColor: '#1f1f1f' },
  boostThumb: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', resizeMode: 'cover' },
});
