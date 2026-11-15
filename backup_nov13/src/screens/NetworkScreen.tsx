import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function NetworkScreen() {
  return <View style={styles.center}><Text style={styles.text}>Network will go here</Text></View>;
}
const styles = StyleSheet.create({ center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }, text: { color: '#6d7382', fontSize: 16 } });
