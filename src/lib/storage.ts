// @ts-nocheck
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Cross-platform key-value storage.
 * - APK: uses @capacitor/preferences (native SharedPreferences on Android)
 * - Web: uses localStorage
 *
 * All methods are async even on web (to keep call sites consistent).
 */

export async function getItem(key) {
  if (isNative()) {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return null;
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key, value) {
  if (isNative()) {
    try {
      await Preferences.set({ key, value: value ?? '' });
      return true;
    } catch {
      return false;
    }
  }
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function removeItem(key) {
  if (isNative()) {
    try { await Preferences.remove({ key }); return true; } catch { return false; }
  }
  try { localStorage.removeItem(key); return true; } catch { return false; }
}

export async function getJSON(key) {
  const raw = await getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setJSON(key, value) {
  if (value == null) return removeItem(key);
  try {
    return await setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
