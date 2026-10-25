import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ReportModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return Alert.alert('Empty Report', 'Please describe the issue.');
    
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      user_id: profile?.id,
      content: text.trim(),
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);

    if (error) return Alert.alert('Failed', error.message);

    Alert.alert('Success', 'Your report has been sent to the admin.');
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.header}>
            <Ionicons name="warning" size={28} color="#ef4444" />
            <Text style={styles.title}>Report an Issue</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Shake detected! Let us know what went wrong or what you'd like to report.
          </Text>

          <TextInput
            style={styles.input}
            multiline
            numberOfLines={6}
            placeholder="Describe your issue or report here..."
            placeholderTextColor="#6d7382"
            value={text}
            onChangeText={setText}
            autoFocus
          />

          <TouchableOpacity 
            style={[styles.submitBtn, (!text.trim() || submitting) && { opacity: 0.5 }]} 
            onPress={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            <Text style={styles.submitText}>{submitting ? 'Sending…' : 'Submit Report'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
  subtitle: { fontSize: 14, color: '#6d7382', lineHeight: 22, marginBottom: 20 },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#1f1f1f', marginBottom: 20 },
  submitBtn: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
