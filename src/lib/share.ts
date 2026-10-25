import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

type ShareOptions = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
};

type ShareResult = {
  shared: boolean;
  method: 'native' | 'web' | 'clipboard' | 'cancel';
};

/**
 * Open the native share sheet.
 * - Android: opens the system chooser
 * - Returns same shape as web version for parity
 */
export async function shareContent({
  title,
  text,
  url,
  dialogTitle = 'Share via',
}: ShareOptions): Promise<ShareResult> {
  const message = [title || 'LU CONNECT', text, url].filter(Boolean).join('\n\n');

  try {
    const result = await Share.share(
      {
        title: title || 'LU CONNECT',
        message,
        ...(Platform.OS === 'ios' && url ? { url } : {}),
      },
      { dialogTitle }
    );

    if (result.action === Share.dismissedAction) {
      return { shared: false, method: 'cancel' };
    }
    return { shared: true, method: 'native' };
  } catch (e: any) {
    if (e?.message && /cancel/i.test(e.message)) {
      return { shared: false, method: 'cancel' };
    }
    return await copyToClipboard(url || text || '');
  }
}

async function copyToClipboard(value: string): Promise<ShareResult> {
  try {
    await Clipboard.setStringAsync(value);
    return { shared: true, method: 'clipboard' };
  } catch {
    return { shared: false, method: 'cancel' };
  }
}
