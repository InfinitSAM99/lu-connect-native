import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';

const MPESA_NUMBER = '0725303245';
const MPESA_NAME = 'Samuel Mugasia';

const POST_CATEGORIES = [
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'views', label: 'Views' },
  { key: 'duration', label: 'Duration' },
];

// ─── BOOST SHEET ───
function BoostSheet({ open, mode, onClose, onSubmitted }: any) {
  const { profile } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [category, setCategory] = useState('likes');
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [mpesaCode, setMpesaCode] = useState('');
  const [phone, setPhone] = useState(profile?.mobile_number || '');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedPost(null);
      setSelectedPackage(null);
      setMpesaCode('');
      setPhone(profile?.mobile_number || '');
      setErrMsg('');
      setMsg('');
      setCategory(mode === 'followers' ? 'followers' : 'likes');
    }
  }, [open, mode, profile?.mobile_number]);

  useEffect(() => {
    if (!open) return;
    setLoadingPkgs(true);
    (async () => {
      const { data, error } = await supabase
        .from('boost_packages')
        .select('id, label, description, category, amount_ksh, duration_days, quantity, unit, delivery_days, icon, sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) {
        setErrMsg('Could not load packages.');
        setPackages([]);
      } else {
        setPackages(data || []);
      }
      setLoadingPkgs(false);
    })();
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'post' || !profile) return;
    (async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, content, created_at, post_media(media_url)')
        .eq('author_id', profile.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);
      setMyPosts(data || []);
    })();
  }, [open, mode, profile?.id]);

  const canSubmit = !!selectedPackage && (mode === 'followers' || !!selectedPost) && mpesaCode.trim().length >= 6;

  const submit = async () => {
    setErrMsg(''); setMsg('');
    const code = mpesaCode.trim().toUpperCase();
    if (code.length < 6) return setErrMsg('Enter the full M-Pesa confirmation code.');
    setSubmitting(true);

    const isFollower = mode === 'followers';
    const purpose = isFollower ? 'followers' : 'post_boost';
    const metadata = isFollower
      ? { followers: selectedPackage.quantity, package_id: selectedPackage.id, category: 'followers' }
      : { post_id: selectedPost.id, package_id: selectedPackage.id, category: selectedPackage.category, quantity: selectedPackage.quantity, duration_days: selectedPackage.duration_days };

    const { error: payErr } = await supabase.from('payments').insert({
      user_id: profile.id,
      amount: selectedPackage.amount_ksh,
      purpose,
      mpesa_code: code,
      phone: phone.trim(),
      metadata,
    });

    setSubmitting(false);
    if (payErr) return setErrMsg('Submit failed: ' + payErr.message);

    setMsg('Payment submitted. Admin will review shortly.');
    setSelectedPackage(null); setSelectedPost(null); setMpesaCode('');
    onSubmitted?.();
    setTimeout(() => onClose(), 1400);
  };

  const visiblePackages = packages.filter((p) => p.category === category);
  const bundle = packages.find((p) => p.category === 'bundle');
  const amount = selectedPackage?.amount_ksh || 0;
  const showBundle = mode === 'post' && category === 'likes' && selectedPost && !!bundle;

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="90vh">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <Text style={{ fontWeight: '700', fontSize: 20, color: '#fff' }}>{mode === 'followers' ? 'Grow my followers' : 'Boost a post'}</Text>
          <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 4, lineHeight: 18 }}>
            {mode === 'followers' ? 'Choose a package — pay via M-Pesa.' : 'Pick a post, choose what to grow, then pay via M-Pesa.'}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* POST PICKER */}
          {mode === 'post' && !selectedPost && (
            <>
              <SectionLabel>1 · Choose a post</SectionLabel>
              {myPosts.length === 0 && <Text style={{ color: '#6d7382', padding: 20, textAlign: 'center' }}>You haven't posted anything yet.</Text>}
              {myPosts.map((p) => {
                const thumb = p.post_media?.[0]?.media_url;
                return (
                  <TouchableOpacity key={p.id} style={styles.postRow} onPress={() => setSelectedPost(p)}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={{ width: 52, height: 52, borderRadius: 10 }} />
                    ) : (
                      <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={22} color="#6d7382" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontSize: 14, color: '#fff', lineHeight: 18, fontWeight: '500' }} numberOfLines={2}>{p.content || '(media only)'}</Text>
                      <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 4 }}>{new Date(p.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#6d7382" />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {mode === 'post' && selectedPost && (
            <>
              <View style={styles.selectedPostBox}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6d7382', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your post</Text>
                  <Text style={{ fontSize: 14, color: '#fff', lineHeight: 18, fontWeight: '500' }} numberOfLines={2}>{selectedPost.content || '(media only)'}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedPost(null); setSelectedPackage(null); }} style={styles.changeBtn}>
                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>CHANGE</Text>
                </TouchableOpacity>
              </View>

              <SectionLabel>2 · Choose what to grow</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: '#1f1f1f', marginBottom: 12 }}>
                {POST_CATEGORIES.map((t) => (
                  <TouchableOpacity key={t.key} onPress={() => { setCategory(t.key); setSelectedPackage(null); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ color: category === t.key ? '#fff' : '#6d7382', fontWeight: category === t.key ? '600' : '500', fontSize: 14 }}>{t.label}</Text>
                    {category === t.key && <View style={{ height: 3, borderRadius: 1.5, backgroundColor: '#ef4444', marginTop: 8 }} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {showBundle && (
                <View style={{ paddingTop: 12 }}>
                  <FeaturedBundleRow pkg={bundle} selected={selectedPackage?.id === bundle.id} onSelect={() => setSelectedPackage(bundle)} />
                </View>
              )}

              <SectionLabel style={{ marginTop: showBundle ? 20 : 12 }}>{showBundle ? '3 · Or pick a package' : '3 · Pick a package'}</SectionLabel>
              {loadingPkgs && <Text style={{ color: '#6d7382', padding: 20, textAlign: 'center' }}>Loading packages…</Text>}
              {!loadingPkgs && visiblePackages.length === 0 && <Text style={{ color: '#6d7382', padding: 20, textAlign: 'center' }}>No packages in this category yet.</Text>}
              {visiblePackages.map((pkg) => (
                <PackageRow key={pkg.id} label={pkg.label} sub={pkg.description} price={pkg.amount_ksh} selected={selectedPackage?.id === pkg.id} onSelect={() => setSelectedPackage(pkg)} />
              ))}
            </>
          )}

          {mode === 'followers' && (
            <>
              <SectionLabel>Choose a package</SectionLabel>
              {loadingPkgs && <Text style={{ color: '#6d7382', padding: 20, textAlign: 'center' }}>Loading packages…</Text>}
              {!loadingPkgs && visiblePackages.length === 0 && <Text style={{ color: '#6d7382', padding: 20, textAlign: 'center' }}>No follower packages yet.</Text>}
              {visiblePackages.map((pkg) => (
                <PackageRow key={pkg.id} label={pkg.label} sub={pkg.description} price={pkg.amount_ksh} selected={selectedPackage?.id === pkg.id} onSelect={() => setSelectedPackage(pkg)} />
              ))}
            </>
          )}

          {selectedPackage && (mode === 'followers' || selectedPost) && (
            <>
              <SectionLabel style={{ marginTop: 24 }}>{mode === 'followers' ? '2 · Pay with M-Pesa' : '4 · Pay with M-Pesa'}</SectionLabel>
              <PaymentRow iconName="chatbubble-outline" label="M-Pesa number" value={MPESA_NUMBER} />
              <PaymentRow iconName="person-outline" label="Name" value={MPESA_NAME} />
              <PaymentRow iconName="checkmark-circle-outline" label="Amount" value={`KSh ${amount}`} />

              {errMsg ? <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 14 }}>{errMsg}</Text> : null}
              {msg ? <Text style={{ color: '#22c55e', fontSize: 13, marginTop: 14 }}>{msg}</Text> : null}

              <Text style={[styles.label, { marginTop: 16 }]}>M-Pesa confirmation code</Text>
              <TextInput style={styles.input} placeholder="e.g. QK47ABC123" placeholderTextColor="#6d7382" value={mpesaCode} onChangeText={setMpesaCode} autoCapitalize="characters" />

              <Text style={styles.label}>Your phone (optional)</Text>
              <TextInput style={styles.input} placeholder="07XX XXX XXX" placeholderTextColor="#6d7382" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16, opacity: (!canSubmit || submitting) ? 0.5 : 1 }]} onPress={submit} disabled={!canSubmit || submitting}>
                <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : `Submit — KSh ${amount}`}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: '#6d7382', marginTop: 12, textAlign: 'center', lineHeight: 16 }}>An admin reviews each submission manually.</Text>
            </>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function SectionLabel({ children, style }: any) {
  return <Text style={[{ fontSize: 13, fontWeight: '500', color: '#6d7382', paddingVertical: 8 }, style]}>{children}</Text>;
}

function PackageRow({ label, sub, price, selected, onSelect }: any) {
  return (
    <TouchableOpacity 
      style={[styles.packageRow, selected && styles.packageRowSelected]} 
      onPress={onSelect}
    >
      {/* Refined Radio Button */}
      <View style={[styles.radioOuter, selected && { borderColor: '#ef4444' }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{label}</Text>
        {sub && <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 2 }}>{sub}</Text>}
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444' }}>KSh {price}</Text>
    </TouchableOpacity>
  );
}

function FeaturedBundleRow({ pkg, selected, onSelect }: any) {
  return (
    <TouchableOpacity style={[styles.packageRow, { backgroundColor: selected ? '#ef4444' : 'rgba(239,68,68,0.1)', borderRadius: 12, borderBottomWidth: 0 }]} onPress={onSelect}>
      <View style={[styles.radioOuter, { borderColor: selected ? '#fff' : '#ef4444' }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: '#fff' }]} />}
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: selected ? '#fff' : '#ef4444' }}>{pkg.label}</Text>
        <Text style={{ fontSize: 12, opacity: 0.85, color: selected ? '#fff' : '#ef4444', marginTop: 2 }}>{pkg.description}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: selected ? '#fff' : '#ef4444' }}>KSh {pkg.amount_ksh}</Text>
    </TouchableOpacity>
  );
}

function PaymentRow({ iconName, label, value }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <Ionicons name={iconName} size={18} color="#6d7382" style={{ width: 24 }} />
      <Text style={{ fontSize: 14, color: '#6d7382' }}>{label}: <Text style={{ color: '#fff', fontWeight: '500' }}>{value}</Text></Text>
    </View>
  );
}

export default function GetBoostedScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState('followers');
  const [payments, setPayments] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('payments').select('id, purpose, amount, mpesa_code, status, metadata, created_at').eq('user_id', profile.id).in('purpose', ['followers', 'post_boost']).order('created_at', { ascending: false }).limit(20);
    setPayments(data || []);
  };

  useEffect(() => { load(); }, [profile?.id]);

  const openSheet = (m: string) => {
    setMode(m);
    setSheetOpen(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar hero title="Boost" subtitle="Grow your audience faster" showBack={true} onBack={() => navigation.goBack()} rightComponent={<Ionicons name="rocket" size={48} color="#ef4444" style={{ marginTop: 4 }} />} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        <View style={styles.hero}>
          <Ionicons name="rocket" size={72} color="#ef4444" style={{ marginBottom: 20 }} />
          <Text style={styles.heroTitle}>Get more eyes on your content</Text>
          <Text style={styles.heroSubtitle}>Boost a post to reach more students, or grow your follower count faster with a package.</Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 32 }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openSheet('post')}>
            <Ionicons name="flame" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Boost a post</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openSheet('followers')}>
            <Ionicons name="people" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Grow my followers</Text>
          </TouchableOpacity>
        </View>

        {payments.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity style={styles.historyToggle} onPress={() => setHistoryOpen(!historyOpen)}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#fff' }}>Boost history</Text>
              <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#6d7382" />
            </TouchableOpacity>

            {historyOpen && payments.map((p) => (
              <View key={p.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: '#fff' }}>
                    {p.purpose === 'followers' ? `+${p.metadata?.followers || 0} followers` : `Post boost · ${p.metadata?.hours || 0}h`}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6d7382', marginTop: 2 }}>{p.mpesa_code} · {new Date(p.created_at).toLocaleDateString()}</Text>
                </View>
                <StatusPill status={p.status} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <BoostSheet open={sheetOpen} mode={mode} onClose={() => setSheetOpen(false)} onSubmitted={load} />
    </View>
  );
}

function StatusPill({ status }: any) {
  const s = status === 'approved' ? { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' } : status === 'rejected' ? { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' } : { bg: '#141414', color: '#aab0bd' };
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  heroTitle: { fontWeight: '700', fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 10 },
  heroSubtitle: { fontSize: 14, color: '#6d7382', lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 10, padding: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  postRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  selectedPostBox: { flexDirection: 'row', backgroundColor: '#141414', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1f1f1f' },
  changeBtn: { backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 12 },
  
  // Refined Package Row Styles
  packageRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f', borderRadius: 8 },
  packageRowSelected: { backgroundColor: '#141414', borderBottomWidth: 0, marginVertical: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#6d7382', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  
  label: { fontSize: 13, color: '#6d7382', marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 12 },
});
