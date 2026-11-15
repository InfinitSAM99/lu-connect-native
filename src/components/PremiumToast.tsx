import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{text1}</Text>
        {text2 ? <Text style={styles.subtitle}>{text2}</Text> : null}
      </View>
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
        <Ionicons name="alert-circle" size={24} color="#ef4444" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{text1}</Text>
        {text2 ? <Text style={styles.subtitle}>{text2}</Text> : null}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: { width: width - 32, backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  subtitle: { color: '#a1a1aa', fontSize: 13 },
});
