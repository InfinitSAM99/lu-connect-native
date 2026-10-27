import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get('window');

export default function AuthErrorSheet({ visible, title, message, onClose, onReset, showReset = false }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          
          <View style={styles.iconWrap}>
            <Ionicons name="warning" size={48} color="#ef4444" />
          </View>
          
          <Text style={styles.title}>{title || 'Login failed'}</Text>
          <Text style={styles.message}>{message || 'Something went wrong. Please try again.'}</Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Try again</Text>
            </TouchableOpacity>
            
            {showReset && (
              <TouchableOpacity onPress={onReset} style={[styles.btn, styles.btnSecondary]}>
                <Text style={styles.btnSecondaryText}>Reset password</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    minHeight: SCREEN_H * 0.35,
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2a2a2a', marginBottom: 24 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  message: { color: '#aab0bd', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
  buttonGroup: { width: '100%', gap: 10 },
  btn: { padding: 16, borderRadius: 14, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#ef4444' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#1f1f1f' },
  btnSecondaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
