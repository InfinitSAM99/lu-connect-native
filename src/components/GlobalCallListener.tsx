import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCallStore } from '../lib/globalState';

export default function GlobalCallListener() {
  const { profile } = useAuth();
  const { setIncomingCall } = useCallStore();

  useEffect(() => {
    if (!profile?.id) return;
    console.log('GlobalCallListener: Listening for calls on', profile.id);

    const channel = supabase.channel('global_calls_listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'active_calls', filter: `receiver_id=eq.${profile.id}` },
        async (payload) => {
          console.log('🔥 DB Trigger: Incoming call received!', payload);
          
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', payload.new.caller_id)
            .single();

          if (callerProfile) {
            setIncomingCall(true, { 
              ...callerProfile, 
              callId: payload.new.id 
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('GlobalCallListener Status:', status);
      });

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [profile?.id]);

  return null;
}
