import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomSheet from '../components/BottomSheet';
import TopBar from '../components/TopBar';
import VerifiedBadge from '../components/VerifiedBadge';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function SheetHeader({ iconName, title, subtitle }: any) {
  return (
    <View style={styles.sheetHeader}>
      <Ionicons name={iconName} size={48} color="#ef4444" style={{ marginBottom: 16 }} />
      <Text style={styles.sheetTitle}>{title}</Text>
      {subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function Field({ label, children }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function FlatRow({ onClick, iconName, title, subtitle, danger }: any) {
  return (
    <TouchableOpacity style={styles.flatRow} onPress={onClick}>
      <View style={{ width: 24, alignItems: 'center' }}>
        <Ionicons name={iconName} size={22} color={danger ? '#ef4444' : '#fff'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.flatRowTitle, danger && { color: '#ef4444' }]}>{title}</Text>
        {subtitle && <Text style={styles.flatRowSubtitle}>{subtitle}</Text>}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={18} color="#6d7382" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { profile, reloadProfile, signOut } = useAuth();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const [personalForm, setPersonalForm] = useState({ full_name: '', email: '', mobile_number: '', birthday_month: '', birthday_day: '' });
  const [profileForm, setProfileForm] = useState<any>({});
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [newEmail, setNewEmail] = useState('');

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);

  useEffect(() => {
    if (profile) {
      setPersonalForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        mobile_number: profile.mobile_number || '',
        birthday_month: profile.birthday_month || '',
        birthday_day: profile.birthday_day || '',
      });
      setProfileForm({
        bio: profile.bio || '', faculty: profile.faculty || '', course: profile.course || '',
        year_of_study: profile.year_of_study || '', location: profile.location || '',
        hometown: profile.hometown || '', residence: profile.residence || '',
        relationship_status: profile.relationship_status || '', interests: profile.interests || '',
      });
    }
  }, [profile?.id]);

  useEffect(() => {
    if (route?.params?.edit) {
      setActiveSheet(route.params.edit);
      navigation.setParams({ edit: null });
    }
  }, [route?.params?.edit]);

  if (!profile) return <View style={styles.center}><Text style={{ color: '#6d7382' }}>Loading…</Text></View>;

  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—';

  const closeSheet = () => {
    setActiveSheet(null);
    setMsg(''); setErrMsg('');
    setPwdForm({ current: '', next: '', confirm: '' });
    setNewEmail('');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
          setSigningOut(true);
          await signOut();
                  }
      }
    ]);
  };

  const savePersonal = async () => {
    setSubmitting(true); setErrMsg(''); setMsg('');
    const fields = {
      full_name: personalForm.full_name?.trim() || profile.full_name,
      mobile_number: personalForm.mobile_number?.trim() || null,
      birthday_month: personalForm.birthday_month ? Number(personalForm.birthday_month) : null,
      birthday_day: personalForm.birthday_day ? Number(personalForm.birthday_day) : null,
    };
    const { error } = await supabase.from('profiles').update(fields).eq('id', profile.id);
    setSubmitting(false);
    if (error) return setErrMsg(error.message);
    setMsg('Saved!'); await reloadProfile?.();
    setTimeout(() => closeSheet(), 900);
  };

  const saveProfileInfo = async () => {
    setSubmitting(true); setErrMsg(''); setMsg('');
    const fields = {
      bio: profileForm.bio, faculty: profileForm.faculty, course: profileForm.course,
      year_of_study: profileForm.year_of_study ? Number(profileForm.year_of_study) : null,
      location: profileForm.location, hometown: profileForm.hometown, residence: profileForm.residence,
      relationship_status: profileForm.relationship_status, interests: profileForm.interests,
    };
    const { error } = await supabase.from('profiles').update(fields).eq('id', profile.id);
    setSubmitting(false);
    if (error) return setErrMsg(error.message);
    setMsg('Saved!'); await reloadProfile?.();
    setTimeout(() => closeSheet(), 900);
  };

  const changePassword = async () => {
    setErrMsg(''); setMsg('');
    if (!pwdForm.current) return setErrMsg('Enter your current password');
    if (pwdForm.next.length < 8) return setErrMsg('New password must be 8+ characters');
    if (pwdForm.next !== pwdForm.confirm) return setErrMsg('Passwords do not match');
    setSubmitting(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: pwdForm.current });
    if (signErr) { setSubmitting(false); return setErrMsg('Current password is incorrect'); }
    const { error } = await supabase.auth.updateUser({ password: pwdForm.next });
    setSubmitting(false);
    if (error) return setErrMsg(error.message);
    setMsg('Password updated!'); setPwdForm({ current: '', next: '', confirm: '' });
    setTimeout(() => closeSheet(), 1200);
  };

  const changeEmail = async () => {
    setErrMsg(''); setMsg('');
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return setErrMsg('Enter a valid email');
    if (email === profile.email) return setErrMsg('That is your current email');
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSubmitting(false);
    if (error) return setErrMsg(error.message);
    setMsg(`Confirmation link sent to ${email}.`);
    setNewEmail('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TopBar
        hero
        title="Settings"
        subtitle="Manage your account and app preferences"
        showBack={false}
        rightComponent={<Ionicons name="settings-outline" size={48} color="#ef4444" style={{ marginTop: 4 }} />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        
        {/* PROFILE CARD */}
        <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile', { id: profile.id })}>
          <View style={styles.avatar}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{profile.full_name?.[0] || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: '#fff' }}>{profile.full_name}</Text>
              {profile.is_verified && <VerifiedBadge size={16} />}
            </View>
            <Text style={{ fontSize: 13, color: '#6d7382', marginTop: 2 }}>View profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6d7382" />
        </TouchableOpacity>

        {/* NAVIGATION LINKS */}
        <FlatRow onClick={() => navigation.navigate('AccountsCenter')} iconName="person-outline" title="Accounts Center" subtitle="Password, personal details & professional mode" />
        <View style={styles.divider} />
        <FlatRow onClick={() => navigation.navigate('Preferences')} iconName="color-palette-outline" title="Preferences" subtitle="Theme, vibration, notifications & sound" />
        <View style={styles.divider} />
        <FlatRow onClick={() => navigation.navigate('Announcements')} iconName="megaphone-outline" title="Announcements" subtitle="Campus-wide updates" />
        <View style={styles.divider} />
        <FlatRow onClick={() => navigation.navigate('Events')} iconName="calendar-outline" title="Events" subtitle="What is happening on campus" />
        <View style={styles.divider} />
        <FlatRow onClick={() => navigation.navigate('Saved')} iconName="bookmark-outline" title="Saved" subtitle="Posts you bookmarked" />
        <View style={styles.divider} />
        <FlatRow onClick={handleSignOut} iconName="log-out-outline" title={signingOut ? 'Signing out…' : 'Sign out'} danger />

        <Text style={styles.memberSince}>Member since {memberSince}</Text>

        {/* All bottom sheets copied from previous version */}
        {/* ─────────── SHEET 1: PERSONAL DETAILS ─────────── */}
        <BottomSheet open={activeSheet === 'personal'} onClose={closeSheet}>
          <SheetHeader iconName="person-circle-outline" title="Personal details" subtitle="Manage your name, contact and birthday information." />
          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            <Field label="Full name">
              <TextInput style={styles.input} value={personalForm.full_name} onChangeText={(v) => setPersonalForm({ ...personalForm, full_name: v })} placeholderTextColor="#6d7382" />
            </Field>
            <Field label="Email address">
              <View style={styles.disabledBox}>
                <Text style={{ fontSize: 14, color: '#fff' }}>{profile.email}</Text>
                <TouchableOpacity onPress={() => { setActiveSheet('email'); setNewEmail(''); }}>
                  <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 13 }}>Change</Text>
                </TouchableOpacity>
              </View>
            </Field>
            <Field label="Phone number">
              <TextInput style={styles.input} keyboardType="phone-pad" value={personalForm.mobile_number} onChangeText={(v) => setPersonalForm({ ...personalForm, mobile_number: v })} placeholder="e.g. 07XX XXX XXX" placeholderTextColor="#6d7382" />
            </Field>
            <Field label="Birthday">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setShowMonthPicker(true)}>
                  <Text style={{ color: personalForm.birthday_month ? '#fff' : '#6d7382' }}>
                    {personalForm.birthday_month ? MONTHS[personalForm.birthday_month - 1] : 'Month'}
                  </Text>
                </TouchableOpacity>
                <TextInput style={[styles.input, { width: 100 }]} keyboardType="number-pad" value={String(personalForm.birthday_day)} onChangeText={(v) => setPersonalForm({ ...personalForm, birthday_day: v })} placeholder="Day" placeholderTextColor="#6d7382" />
              </View>
            </Field>
            {errMsg ? <Text style={styles.errorText}>{errMsg}</Text> : null}
            {msg ? <Text style={styles.successText}>{msg}</Text> : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={savePersonal} disabled={submitting}>
              <Text style={styles.primaryBtnText}>{submitting ? 'Saving…' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>

        {/* ─────────── SHEET 2: PROFILE INFORMATION ─────────── */}
        <BottomSheet open={activeSheet === 'profile'} onClose={closeSheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <SheetHeader iconName="pencil" title="Profile information" subtitle="Tell people about yourself." />
            <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              <Field label="Bio">
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={profileForm.bio} onChangeText={(v) => setProfileForm({ ...profileForm, bio: v })} placeholder="A short intro about you" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="Faculty">
                <TextInput style={styles.input} value={profileForm.faculty} onChangeText={(v) => setProfileForm({ ...profileForm, faculty: v })} placeholder="e.g. Education" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="Course">
                <TextInput style={styles.input} value={profileForm.course} onChangeText={(v) => setProfileForm({ ...profileForm, course: v })} placeholder="e.g. Bachelor of Education Arts" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="Year of study">
                <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowYearPicker(true)}>
                  <Text style={{ color: profileForm.year_of_study ? '#fff' : '#6d7382' }}>
                    {profileForm.year_of_study ? `Year ${profileForm.year_of_study}` : '—'}
                  </Text>
                </TouchableOpacity>
              </Field>
              <Field label="Location">
                <TextInput style={styles.input} value={profileForm.location} onChangeText={(v) => setProfileForm({ ...profileForm, location: v })} placeholder="e.g. Nairobi, Kenya" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="Hometown">
                <TextInput style={styles.input} value={profileForm.hometown} onChangeText={(v) => setProfileForm({ ...profileForm, hometown: v })} placeholder="e.g. Kisumu" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="Residence / Hostel">
                <TextInput style={styles.input} value={profileForm.residence} onChangeText={(v) => setProfileForm({ ...profileForm, residence: v })} placeholder="e.g. Hall 4" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="Relationship status">
                <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowRelPicker(true)}>
                  <Text style={{ color: profileForm.relationship_status ? '#fff' : '#6d7382' }}>
                    {profileForm.relationship_status || '—'}
                  </Text>
                </TouchableOpacity>
              </Field>
              <Field label="Interests (comma separated)">
                <TextInput style={styles.input} value={profileForm.interests} onChangeText={(v) => setProfileForm({ ...profileForm, interests: v })} placeholder="e.g. Football, Coding, Music" placeholderTextColor="#6d7382" />
              </Field>
              {errMsg ? <Text style={styles.errorText}>{errMsg}</Text> : null}
              {msg ? <Text style={styles.successText}>{msg}</Text> : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={saveProfileInfo} disabled={submitting}>
                <Text style={styles.primaryBtnText}>{submitting ? 'Saving…' : 'Save changes'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </BottomSheet>

        {/* ─────────── SHEET 3: PASSWORD & SECURITY ─────────── */}
        <BottomSheet open={activeSheet === 'password'} onClose={closeSheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <SheetHeader iconName="lock-closed" title="Password & security" subtitle="Update your login password or add another way to recover your account." />
            <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              <Field label="Current password">
                <TextInput style={styles.input} secureTextEntry value={pwdForm.current} onChangeText={(v) => setPwdForm({ ...pwdForm, current: v })} placeholder="Enter current password" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="New password">
                <TextInput style={styles.input} secureTextEntry value={pwdForm.next} onChangeText={(v) => setPwdForm({ ...pwdForm, next: v })} placeholder="At least 8 characters" placeholderTextColor="#6d7382" />
              </Field>
              <Field label="Confirm new password">
                <TextInput style={styles.input} secureTextEntry value={pwdForm.confirm} onChangeText={(v) => setPwdForm({ ...pwdForm, confirm: v })} placeholder="Repeat new password" placeholderTextColor="#6d7382" />
              </Field>
              {errMsg ? <Text style={styles.errorText}>{errMsg}</Text> : null}
              {msg ? <Text style={styles.successText}>{msg}</Text> : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={changePassword} disabled={submitting}>
                <Text style={styles.primaryBtnText}>{submitting ? 'Updating…' : 'Update password'}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Ionicons name="mail" size={48} color="#ef4444" style={{ marginBottom: 12 }} />
                <Text style={{ fontWeight: '700', fontSize: 16, color: '#fff', marginBottom: 6 }}>Change email address</Text>
                <Text style={{ fontSize: 13, color: '#6d7382', textAlign: 'center', lineHeight: 20 }}>We'll send a confirmation link to your new email. Your current email stays active until you confirm.</Text>
              </View>
              <Field label="New email address">
                <TextInput style={styles.input} keyboardType="email-address" value={newEmail} onChangeText={setNewEmail} placeholder="e.g. name@example.com" placeholderTextColor="#6d7382" />
              </Field>
              <TouchableOpacity style={[styles.outlineBtn, (!newEmail.trim() || submitting) && { opacity: 0.5 }]} onPress={changeEmail} disabled={submitting || !newEmail.trim()}>
                <Text style={styles.outlineBtnText}>Send confirmation link</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </BottomSheet>

        {/* ─────────── SHEET 4: CHANGE EMAIL ─────────── */}
        <BottomSheet open={activeSheet === 'email'} onClose={closeSheet}>
          <SheetHeader iconName="mail" title="Change email" subtitle="We'll send a confirmation link to your new email." />
          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            <Field label="Current email">
              <View style={styles.disabledBox}><Text style={{ fontSize: 14, color: '#6d7382' }}>{profile.email}</Text></View>
            </Field>
            <Field label="New email address">
              <TextInput style={styles.input} keyboardType="email-address" value={newEmail} onChangeText={setNewEmail} placeholder="e.g. name@example.com" placeholderTextColor="#6d7382" />
            </Field>
            {errMsg ? <Text style={styles.errorText}>{errMsg}</Text> : null}
            {msg ? <Text style={styles.successText}>{msg}</Text> : null}
            <TouchableOpacity style={[styles.primaryBtn, (!newEmail.trim() || submitting) && { opacity: 0.5 }]} onPress={changeEmail} disabled={submitting || !newEmail.trim()}>
              <Text style={styles.primaryBtnText}>{submitting ? 'Sending…' : 'Send confirmation link'}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>

        {/* ─────────── SHEET 5: USERNAME ─────────── */}
        <BottomSheet open={activeSheet === 'username'} onClose={closeSheet}>
          <SheetHeader iconName="at" title="Username" subtitle="Your unique handle on LU Connect." />
          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            <Field label="Username">
              <TextInput style={styles.input} value={profileForm.username || profile.username || ''} onChangeText={(v) => setProfileForm({ ...profileForm, username: v })} placeholder="Choose a username" placeholderTextColor="#6d7382" autoCapitalize="none" />
            </Field>
            {errMsg ? <Text style={styles.errorText}>{errMsg}</Text> : null}
            {msg ? <Text style={styles.successText}>{msg}</Text> : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={async () => {
              setSubmitting(true); setErrMsg(''); setMsg('');
              const { error } = await supabase.from('profiles').update({ username: profileForm.username }).eq('id', profile.id);
              setSubmitting(false);
              if (error) return setErrMsg(error.message);
              setMsg('Username updated!');
              await reloadProfile?.();
              setTimeout(() => closeSheet(), 900);
            }} disabled={submitting}>
              <Text style={styles.primaryBtnText}>{submitting ? 'Saving…' : 'Save username'}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#141414', borderRadius: 14, marginHorizontal: 16, marginTop: 16, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 16 },
  flatRowTitle: { fontWeight: '500', fontSize: 15, color: '#fff' },
  flatRowSubtitle: { fontSize: 13, color: '#6d7382', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#1f1f1f', marginVertical: 4, marginHorizontal: 16 },
  memberSince: { textAlign: 'center', fontSize: 12, color: '#6d7382', paddingVertical: 32 },
  sheetHeader: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 24, paddingBottom: 20 },
  sheetTitle: { fontWeight: '700', fontSize: 20, color: '#fff', marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: '#6d7382', textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 13, color: '#6d7382', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#141414', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1f1f1f' },
  disabledBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#141414', borderRadius: 10, padding: 14 },
  primaryBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 14, alignItems: 'center' },
  outlineBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 12 },
  successText: { color: '#22c55e', fontSize: 13, marginBottom: 12 },
});
