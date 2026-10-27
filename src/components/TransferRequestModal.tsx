import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function TransferRequestModal() {
  const { transferRequest, approveTransfer, rejectTransfer } = useAuth();

  if (!transferRequest) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconWrap}>
            <Ionicons name="phone-portrait-outline" size={32} color="#ef4444" />
          </View>
          <Text style={styles.title}>New Login Request</Text>
          <Text style={styles.message}>
            Another device is trying to log in to your account. Do you want to allow this? You will be logged out of this device.
          </Text>
          
          <TouchableOpacity onPress={approveTransfer} style={styles.btnApprove}>
            <Text style={styles.btnApproveText}>Yes, transfer session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={rejectTransfer} style={styles.btnReject}>
            <Text style={styles.btnRejectText}>No, keep me logged in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { backgroundColor: '#0a0a0a', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#1f1f1f', alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  message: { color: '#aab0bd', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  btnApprove: { backgroundColor: '#ef4444', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnApproveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnReject: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnRejectText: { color: '#6d7382', fontSize: 15, fontWeight: '600' },
});
