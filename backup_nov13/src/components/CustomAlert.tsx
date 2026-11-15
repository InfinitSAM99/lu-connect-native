import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LULogo from './LULogo';

export default function CustomAlert({ visible, title, message, onCancel, onConfirm, confirmText = 'DELETE', cancelText = 'CANCEL', isDestructive = true }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* Main Grey Box */}
          <View style={styles.box}>
            
            {/* LU LOGO INSIDE THE BOX */}
            <View style={styles.logoWrapper}>
              <LULogo size={56} animate={false} />
            </View>

            {/* ALERT CONTENT */}
            <View style={styles.body}>
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.button} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
              
              {/* Vertical Divider */}
              <View style={styles.verticalDivider} />
              
              <TouchableOpacity style={styles.button} onPress={onConfirm}>
                <Text style={[styles.confirmText, isDestructive && { color: '#ef4444' }]}>
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>

          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  box: {
    width: '100%',
    backgroundColor: '#333333', // Grey box
    borderRadius: 20,
    overflow: 'hidden', // Ensures buttons don't bleed out
    alignItems: 'center',
  },
  logoWrapper: {
    marginTop: 24,
    marginBottom: 12,
    // The LU logo itself has a black background, so it looks like a badge
  },
  body: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#aab0bd',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10, // Slight padding for the divider
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6d7382',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
