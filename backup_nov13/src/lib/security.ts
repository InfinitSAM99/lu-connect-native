import { supabase } from './supabase';

// We use a safe require so the app doesn't crash if the native module isn't rebuilt yet
let SafetyUtils: any = null;
try {
  SafetyUtils = require('react-native-safety-utils').default;
} catch (e) {
  console.log('SafetyUtils native module not found.');
}

export async function runSecurityCheck(email: string) {
  if (!SafetyUtils) return; // Skip if module isn't built

  try {
    const isVpn = await SafetyUtils.isVpnActive();
    const isDebug = await SafetyUtils.isDeveloperOptionsEnabled();
    const isProxy = await SafetyUtils.isProxyEnabled();

    if (isVpn || isDebug || isProxy) {
      // Log the suspicious activity to your database
      await supabase.rpc('log_security_event', {
        p_event_type: 'suspicious_activity',
        p_email: email,
        p_details: {
          vpn_active: isVpn,
          developer_mode: isDebug,
          proxy_active: isProxy,
          device_flagged_at: new Date().toISOString(),
        }
      });
    }
  } catch (error) {
    console.log('Security check failed:', error);
  }
}
