import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  try {
    const body = await req.json()
    const stk = body?.Body?.stkCallback
    if (!stk) return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Ignored" }), { headers: { "Content-Type": "application/json" } })

    const checkoutRequestId = stk.CheckoutRequestID
    const resultCode = stk.ResultCode
    const resultDesc = stk.ResultDesc

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: rows } = await supa.from("payments").select("id, metadata").eq("status", "pending").contains("metadata", { checkout_request_id: checkoutRequestId }).limit(1)

    const payment = rows?.[0]
    if (!payment) return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "No matching payment" }), { headers: { "Content-Type": "application/json" } })

    if (resultCode === 0) {
      const meta = stk.CallbackMetadata?.Item || []
      const getItem = (name: string) => meta.find((x: any) => x.Name === name)?.Value
      await supa.from("payments").update({
        status: "paid", mpesa_code: getItem("MpesaReceiptNumber") || null,
        phone: getItem("PhoneNumber") ? String(getItem("PhoneNumber")) : null,
        amount: getItem("Amount") || null,
        metadata: { ...(payment.metadata || {}), result_code: resultCode, result_desc: resultDesc },
      }).eq("id", payment.id)
    } else {
      await supa.from("payments").update({
        status: "failed", metadata: { ...(payment.metadata || {}), result_code: resultCode, result_desc: resultDesc }
      }).eq("id", payment.id)
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }), { headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Error: " + e.message }), { headers: { "Content-Type": "application/json" } })
  }
})
