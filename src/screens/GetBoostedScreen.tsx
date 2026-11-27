import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import FastButton from '../components/FastButton';

const MPESA_NUMBER = '0725303245';
const MPESA_NAME = 'Samuel Mugasia';

export default function GetBoostedScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [mode, setMode] = useState<'main' | 'post' | 'followers'>('main');
  
  // Data
  const [packages, setPackages] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard State
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('likes');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Payment State
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'polling' | 'success' | 'failed'>('idle');
  const pollingRef = useRef<any>(null);

  const userMpesa = profile?.mpesa_number || '';
  const userAirtel = profile?.airtel_number || '';
  const savedPhone = userMpesa || userAirtel;
  const [phone] = useState(savedPhone);

  // Reset wizard when switching modes
  useEffect(() => {
    if (mode !== 'main') {
      setCurrentStep(0);
      setSelectedPost(null);
      setSelectedCategory('likes');
      setSelectedPackage(null);
      setErrMsg('');
      setPaymentStatus('idle');
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [mode]);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      setLoading(true);
      const { data: pkgs } = await supabase.from('boost_packages').select('*').eq('active', true).order('sort_order');
      setPackages(pkgs || []);

      const { data: posts } = await supabase.from('posts').select('id, content, post_media(media_url)').eq('author_id', profile.id).eq('is_deleted', false).order('created_at', { ascending: false }).limit(20);
      setMyPosts(posts || []);

      const { data: history } = await supabase.from('payments').select('id, purpose, amount, mpesa_code, status, metadata, created_at').eq('user_id', profile.id).in('purpose', ['followers', 'post_boost']).order('created_at', { ascending: false }).limit(30);
        
      const postIds = (history || []).map((p: any) => p.metadata?.post_id).filter(Boolean);
      let postMap: any = {};
      if (postIds.length > 0) {
        const { data: postsData } = await supabase.from('posts').select('id, content, post_media(media_url)').in('id', postIds);
        (postsData || []).forEach((p: any) => { postMap[p.id] = p; });
      }
      setPayments((history || []).map((p: any) => ({ ...p, _post: p.metadata?.post_id ? postMap[p.metadata.post_id] : null })));
      setLoading(false);
    };
    load();
  }, [profile?.id, mode]);

  // Polling Logic
  const startPolling = (paymentIntentId: string) => {
    setPaymentStatus('polling');
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      const { data } = await supabase.from('payments').select('status').eq('id', paymentIntentId).single();
      
      if (data?.status === 'paid' || data?.status === 'approved') {
        clearInterval(pollingRef.current);
        setPaymentStatus('success');
      } else if (data?.status === 'failed' || data?.status === 'cancelled') {
        clearInterval(pollingRef.current);
        setPaymentStatus('failed');
      } else if (attempts >= 20) { // 20 * 3s = 60s
        clearInterval(pollingRef.current);
        setPaymentStatus('failed');
      }
    }, 3000); // check every 3 seconds
  };

  const submitPayment = async () => {
    if (!savedPhone) {
      setErrMsg('Please link a payment number first.');
      return;
    }
    
    setSubmitting(true);
    setErrMsg('');

    const isFollower = mode === 'followers';
    const purpose = isFollower ? 'followers' : 'post_boost';
    const metadata = isFollower
      ? { followers: selectedPackage.quantity, package_id: selectedPackage.id, category: 'followers' }
      : { post_id: selectedPost.id, package_id: selectedPackage.id, category: selectedPackage.category, quantity: selectedPackage.quantity, duration_days: selectedPackage.duration_days };

    try {
      const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
        body: { phone: savedPhone, amount: selectedPackage.amount_ksh, purpose, user_id: profile!.id, metadata }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Assume the backend returns the payment ID so we can poll it
      const paymentId = data?.payment_id || data?.id;
      if (paymentId) startPolling(paymentId);
      else {
        // Fallback: If no ID returned, we just say it's pending
        setPaymentStatus('success');
      }
    } catch (e: any) {
      setErrMsg('Payment failed: ' + (e.message || 'Unknown error'));
      setPaymentStatus('idle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (mode === 'main') {
      navigation.goBack();
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setMode('main');
    }
  };

  // --- MAIN SCREEN ---
  if (mode === 'main') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TopBar title="Boost" showBack={true} onBack={handleBack} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Ionicons name="rocket" size={60} color="#ef4444" />
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>Get more eyes on your content</Text>
            <Text style={{ color: '#6d7382', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 30 }}>Boost a post to reach more students, or grow your follower count faster with a package.</Text>
          </View>

          <FastButton onPress={() => setMode('post')} style={{ backgroundColor: '#ef4444', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <Ionicons name="flame" size={24} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Boost a post</Text>
          </FastButton>

          <FastButton onPress={() => setMode('followers')} style={{ backgroundColor: '#ef4444', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Ionicons name="people" size={24} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Grow my followers</Text>
          </FastButton>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f1f1f' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Boost history</Text>
          </View>

          {!loading && payments.length === 0 && <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 20 }}>No boosts yet.</Text>}
          {!loading && payments.map((p) => (
            <View key={p.id} style={styles.historyCard}>
              <View style={styles.historyThumbWrap}>
                {p._post?.post_media?.[0]?.media_url ? (
                  <Image source={{ uri: p._post.post_media[0].media_url }} style={styles.historyThumb} />
                ) : (
                  <Ionicons name={p.purpose === 'followers' ? 'people' : 'flame'} size={22} color="#ef4444" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                  {p.purpose === 'followers' ? `+${p.metadata?.followers || 0} followers` : `${p.metadata?.quantity ? '+' : ''}${p.metadata?.quantity || 0} ${p.metadata?.category || 'boosts'}`}
                </Text>
                <Text style={{ color: '#6d7382', fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                  {p._post?.content ? `"${p._post.content.slice(0, 30)}..."` : (p.purpose === 'followers' ? 'Follower growth' : 'Post boost')}
                </Text>
              </View>
              <StatusBadge status={p.status} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // --- WIZARD SCREEN ---
  const categories = [
    { key: 'likes', icon: 'heart' },
    { key: 'comments', icon: 'chatbubble' },
    { key: 'views', icon: 'eye' },
    { key: 'post', icon: 'rocket' },
    { key: 'bundle', icon: 'star' }
  ];

  const postSteps = [
    { label: 'Which post do you want to boost?', type: 'post_picker' },
    { label: 'What kind of boost?', type: 'category_picker' },
    { label: 'Choose your package', type: 'package_picker' },
    { label: 'Confirm & Pay', type: 'payment' },
  ];

  const followerSteps = [
    { label: 'How many followers?', type: 'package_picker' },
    { label: 'Confirm & Pay', type: 'payment' },
  ];

  const steps = mode === 'post' ? postSteps : followerSteps;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const isStepValid = () => {
    if (currentStepData.type === 'post_picker') return !!selectedPost;
    if (currentStepData.type === 'category_picker') return !!selectedCategory;
    if (currentStepData.type === 'package_picker') return !!selectedPackage;
    if (currentStepData.type === 'payment') return !!savedPhone;
    return true;
  };

  const handleNext = () => {
    if (isLastStep) {
      submitPayment();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const visiblePackages = packages.filter(p => {
    if (mode === 'followers') return p.category === 'followers';
    return p.category === selectedCategory;
  });

  return (
    <View style={styles.container}>
      <TopBar title={mode === 'post' ? 'Boost Post' : 'Grow Followers'} showBack onBack={handleBack} />

      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View key={index} style={[styles.dot, index === currentStep && styles.dotActive, index < currentStep && styles.dotCompleted]} />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.stepLabel}>STEP {currentStep + 1} OF {steps.length}</Text>
          <Text style={styles.questionTitle}>{currentStepData.label}</Text>

          {errMsg ? <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{errMsg}</Text> : null}

          {/* PAYMENT STATUS OVERLAYS */}
          {paymentStatus === 'polling' && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="large" color="#ef4444" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>Waiting for M-Pesa PIN...</Text>
              <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 10 }}>Please enter your PIN on the prompt sent to your phone.</Text>
            </View>
          )}

          {paymentStatus === 'success' && (
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>Payment Successful!</Text>
              <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 10 }}>Your boost is being processed and will start delivering soon.</Text>
              <FastButton onPress={() => setMode('main')} style={{ backgroundColor: '#1f1f1f', padding: 16, borderRadius: 12, marginTop: 30, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Back to History</Text>
              </FastButton>
            </View>
          )}

          {paymentStatus === 'failed' && (
            <View style={styles.statusContainer}>
              <Ionicons name="close-circle" size={80} color="#ef4444" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>Payment Failed or Cancelled</Text>
              <Text style={{ color: '#6d7382', textAlign: 'center', marginTop: 10 }}>The M-Pesa prompt was not completed. Please try again.</Text>
              <FastButton onPress={() => setPaymentStatus('idle')} style={{ backgroundColor: '#1f1f1f', padding: 16, borderRadius: 12, marginTop: 30, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Try Again</Text>
              </FastButton>
            </View>
          )}

          {/* WIZARD CONTENT (Hidden when polling/status) */}
          {paymentStatus === 'idle' && (
            <View style={styles.activeInputWrapper}>
              
              {/* POST PICKER */}
              {currentStepData.type === 'post_picker' && (
                <View style={{ gap: 10 }}>
                  {myPosts.length === 0 && <Text style={{ color: '#6d7382' }}>You have no posts to boost.</Text>}
                  {myPosts.map((post) => (
                    <TouchableOpacity key={post.id} onPress={() => setSelectedPost(post)} style={[styles.flatListItem, selectedPost?.id === post.id && styles.flatListItemSelected]}>
                      {post.post_media?.[0]?.media_url ? (
                        <Image source={{ uri: post.post_media[0].media_url }} style={{ width: 50, height: 50, borderRadius: 8 }} />
                      ) : (
                        <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="document-text" size={20} color="#6d7382" />
                        </View>
                      )}
                      <Text style={{ color: '#fff', flex: 1, fontSize: 14 }} numberOfLines={2}>{post.content || '(Media only)'}</Text>
                      <View style={[styles.radio, selectedPost?.id === post.id && styles.radioSelected]}>
                        {selectedPost?.id === post.id && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* CATEGORY PICKER */}
              {currentStepData.type === 'category_picker' && (
                <View style={{ gap: 10 }}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <TouchableOpacity key={cat.key} onPress={() => { setSelectedCategory(cat.key); setSelectedPackage(null); }} style={[styles.flatListItem, isSelected && styles.flatListItemSelected]}>
                        <Ionicons name={cat.icon as any} size={24} color={isSelected ? '#ef4444' : '#6d7382'} />
                        <Text style={{ color: isSelected ? '#fff' : '#6d7382', flex: 1, fontSize: 16, fontWeight: '600', textTransform: 'capitalize' }}>{cat.key}</Text>
                        <View style={[styles.radio, isSelected && styles.radioSelected]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* PACKAGE PICKER (FLAT LIST) */}
              {currentStepData.type === 'package_picker' && (
                <View>
                  {visiblePackages.length === 0 && <Text style={{ color: '#6d7382' }}>No packages available.</Text>}
                  {visiblePackages.map((pkg, index) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const isLast = index === visiblePackages.length - 1;
                    return (
                      <TouchableOpacity key={pkg.id} onPress={() => setSelectedPackage(pkg)} style={[styles.flatPackageItem, !isLast && styles.flatPackageItemBorder, isSelected && styles.flatPackageItemSelected]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: isSelected ? '#ef4444' : '#fff', fontSize: 16, fontWeight: '700' }}>{pkg.label}</Text>
                          <Text style={{ color: '#6d7382', fontSize: 13, marginTop: 4 }}>{pkg.description}</Text>
                        </View>
                        <Text style={{ color: isSelected ? '#ef4444' : '#6d7382', fontSize: 16, fontWeight: '800' }}>KSh {pkg.amount_ksh}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* PAYMENT CONFIRMATION */}
              {currentStepData.type === 'payment' && (
                <View style={{ gap: 16 }}>
                  <View style={styles.summaryBox}>
                    <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
                    <View style={styles.summaryRow}><Text style={styles.summaryLabel}>M-Pesa Number</Text><Text style={styles.summaryValue}>{MPESA_NUMBER}</Text></View>
                    <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Name</Text><Text style={styles.summaryValue}>{MPESA_NAME}</Text></View>
                    <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}><Text style={styles.summaryLabel}>Amount</Text><Text style={[styles.summaryValue, { color: '#ef4444', fontWeight: '900', fontSize: 20 }]}>KSh {selectedPackage?.amount_ksh}</Text></View>
                  </View>

                  {/* PHONE NUMBER LINK */}
                  <View>
                    <Text style={styles.label}>Payment Phone Number</Text>
                    {savedPhone ? (
                      <View style={styles.savedPhoneBox}>
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{savedPhone}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => navigation.navigate('PaymentMethods')} style={styles.linkNumberBtn}>
                        <Ionicons name="add-circle" size={20} color="#ef4444" />
                        <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 15 }}>Link Payment Number</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

            </View>
          )}

          {/* NEXT / SUBMIT BUTTON */}
          {paymentStatus === 'idle' && (
            <View style={styles.buttonContainer}>
              <FastButton
                style={[styles.mainBtn, { backgroundColor: isStepValid() ? '#ef4444' : '#2a2a2a' }]}
                onPress={handleNext}
                disabled={!isStepValid() || submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <Text style={[styles.mainBtnText, { color: isStepValid() ? '#fff' : '#6d7382' }]}>
                    {isLastStep ? `PAY KSH ${selectedPackage?.amount_ksh}` : 'CONTINUE'}
                  </Text>
                )}
              </FastButton>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  let style = { bg: '#141414', color: '#aab0bd', label: 'PENDING' };
  if (status === 'approved' || status === 'paid') style = { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'APPROVED' };
  else if (status === 'rejected' || status === 'failed') style = { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'FAILED' };
  return (
    <View style={{ backgroundColor: style.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: style.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1f1f1f' },
  dotActive: { backgroundColor: '#ef4444', width: 20, borderRadius: 4 },
  dotCompleted: { backgroundColor: '#6d7382' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60 },
  stepLabel: { color: '#6d7382', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  questionTitle: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: 30 },
  activeInputWrapper: { flex: 1, justifyContent: 'flex-start' },
  buttonContainer: { marginTop: 40 },
  mainBtn: { padding: 18, borderRadius: 14, alignItems: 'center' },
  mainBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  
  // Flat List Styles
  flatListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  flatListItemSelected: { backgroundColor: 'transparent' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#6d7382', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#ef4444' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  
  // Flat Package List Styles
  flatPackageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
  flatPackageItemBorder: { borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  flatPackageItemSelected: { backgroundColor: 'rgba(239,68,68,0.05)' },
  
  // Payment Section
  summaryBox: { backgroundColor: '#0a0a0a', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1f1f1f' },
  sectionLabel: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  summaryLabel: { color: '#6d7382', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  label: { color: '#6d7382', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  
  // Phone Number Styles
  savedPhoneBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#141414', borderRadius: 12, padding: 16 },
  linkNumberBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#ef4444', borderRadius: 12, padding: 16 },
  
  // Status Overlay
  statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  
  // History Section
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1f1f1f', gap: 12 },
  historyThumbWrap: { width: 54, height: 54, borderRadius: 12, overflow: 'hidden', backgroundColor: '#141414', borderWidth: 1, borderColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' },
  historyThumb: { width: 54, height: 54, resizeMode: 'cover' },
});
