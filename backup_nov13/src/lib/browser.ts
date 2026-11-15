// @ts-nocheck
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Open a URL in the platform's native in-app browser.
 * - APK: opens Capacitor's in-app browser (stays in the app)
 * - Web: opens in a new browser tab
 */
export async function openExternal(url) {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch (e) {
      console.warn('Browser.open failed:', e?.message);
    }
  }
  // Web fallback
  window.open(url, '_blank', 'noopener,noreferrer');
}
