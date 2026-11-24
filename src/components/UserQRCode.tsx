import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface UserQRCodeProps {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export default function UserQRCode({ userId, fullName, avatarUrl }: UserQRCodeProps) {
  // The QR code contains a website link that will redirect to the app
  const qrValue = `https://lu-connect-website-sigma.vercel.app/profile/${userId}`;

  return (
    <View style={styles.container}>
      <View style={styles.qrWrap}>
        <QRCode
          value={qrValue}
          size={200}
          color="#000"
          backgroundColor="#fff"
          logo={avatarUrl ? { uri: avatarUrl } : undefined}
          logoSize={50}
          logoBackgroundColor="#fff"
          logoBorderRadius={25}
          logoMargin={4}
        />
      </View>
      <Text style={styles.name}>{fullName}</Text>
      <Text style={styles.hint}>Scan to follow</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20 },
  qrWrap: { backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  name: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hint: { color: '#6d7382', fontSize: 13, marginTop: 4 },
});
