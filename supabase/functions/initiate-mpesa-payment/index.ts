import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY")!
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET")!
const SHORTCODE = Deno.env.get("MPESA_SHORTCODE")!
const PASSKEY = Deno.env.get("MPESA_PASSKEY")!
const CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL")!
const ENVIRONMENT = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const BASE_URL = ENVIRONMENT === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { phone, amount, purpose, user_id } = await req.json()
    if (!phone || !amount || !purpose || !user_id) throw new Error("Missing required fields")

    const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)
    const tokenRes = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    })
    const { access_token } = await tokenRes.json()

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)
    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`)

    let formattedPhone = phone.replace(/\D/g, "")
    if (formattedPhone.startsWith("0")) formattedPhone = `254${formattedPhone.slice(1)}`
    if (formattedPhone.startsWith("7") || formattedPhone.startsWith("1")) formattedPhone = `254${formattedPhone}`
    if (!formattedPhone.startsWith("254")) formattedPhone = `254${formattedPhone}`

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: pending, error: insertErr } = await supa.from("payments").insert({
      user_id, purpose, amount, phone: formattedPhone, status: "pending", metadata: { source: "stk_push" }
    }).select("id").single()

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`)

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE, Password: password, Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", Amount: Math.round(Number(amount)),
        PartyA: formattedPhone, PartyB: SHORTCODE, PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL, AccountReference: `LU-${purpose}`, TransactionDesc: `LU Connect ${purpose}`,
      }),
    })

    const data = await stkRes.json()
    if (!stkRes.ok || data.ResponseCode !== "0") {
      await supa.from("payments").update({ status: "failed", metadata: { source: "stk_push", error: data } }).eq("id", pending.id)
      throw new Error(data.errorMessage || data.error || "STK Push failed")
    }

    await supa.from("payments").update({
      metadata: { source: "stk_push", merchant_request_id: data.MerchantRequestID, checkout_request_id: data.CheckoutRequestID }
    }).eq("id", pending.id)

    return new Response(JSON.stringify({ success: true, payment_id: pending.id, checkout_request_id: data.CheckoutRequestID }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
