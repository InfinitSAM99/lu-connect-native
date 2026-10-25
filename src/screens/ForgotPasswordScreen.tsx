import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ForgotPasswordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ForgotPassword Screen</Text>
      <Text style={styles.sub}>Waiting for native conversion...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sub: { color: '#888', fontSize: 14, marginTop: 8 }
});
