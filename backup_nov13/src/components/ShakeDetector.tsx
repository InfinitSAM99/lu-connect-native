import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, NativeModules } from 'react-native';
import ReportModal from './ReportModal';

// Check if the native module exists before importing
const hasAccelerometer = !!NativeModules.ExponentAccelerometer;

let Accelerometer: any = null;
if (hasAccelerometer) {
  try {
    Accelerometer = require('expo-sensors/build/Accelerometer').default;
  } catch (e) {
    console.warn('Accelerometer module could not be loaded');
  }
}

const SHAKE_THRESHOLD = 1.2;
const SHAKE_TIMEOUT = 1000;

export default function ShakeDetector({ children }: { children: React.ReactNode }) {
  const [reportOpen, setReportOpen] = useState(false);
  const lastShakeTime = useRef(0);
  const lastVals = useRef({ x: 0, y: 0, z: 0 });
  const isShaking = useRef(false);

  useEffect(() => {
    if (!Accelerometer) {
      console.warn('ShakeDetector: Accelerometer not available in this build.');
      return;
    }

    Accelerometer.setUpdateInterval(50);
    const subscription = Accelerometer.addListener(({ x, y, z }: any) => {
      const deltaX = Math.abs(x - lastVals.current.x);
      const deltaY = Math.abs(y - lastVals.current.y);
      const deltaZ = Math.abs(z - lastVals.current.z);
      const totalDelta = deltaX + deltaY + deltaZ;

      if (totalDelta > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime.current > SHAKE_TIMEOUT && !isShaking.current) {
          isShaking.current = true;
          setReportOpen(true);
          setTimeout(() => { isShaking.current = false; }, SHAKE_TIMEOUT);
          lastShakeTime.current = now;
        }
      }
      lastVals.current = { x, y, z };
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
      {children}
      <ReportModal visible={reportOpen} onClose={() => setReportOpen(false)} />
      {!Accelerometer && (
        <View pointerEvents="none" style={styles.debug}>
          <Text style={styles.debugText}>Shake: Not available in Expo Go</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  debug: { position: 'absolute', top: 60, right: 16, backgroundColor: 'rgba(0,0,0,0.7)', padding: 6, borderRadius: 8, zIndex: 99999 },
  debugText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
});
