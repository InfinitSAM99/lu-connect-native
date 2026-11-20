import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // 1. Handle Supabase Webhook format OR direct test format
    const record = payload.record || payload
    const userId = record.user_id

    if (!userId) {
      return new Response(JSON.stringify({ error: "No user_id found in payload" }), { status: 400 })
    }

    // 2. Connect to Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Get the token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Token not found for user", details: tokenError }), { status: 404 })
    }

    // 4. Send to Expo
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tokenData.token,
        sound: 'default',
        title: record.title || 'Test Title',
        body: record.body || 'Test Body',
        data: { link: record.link || '/' },
      }),
    })

    const expoResult = await res.json()
    
    return new Response(JSON.stringify({ ok: true, expoResult }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
