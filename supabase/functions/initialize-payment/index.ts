// supabase/functions/initialize-payment/index.ts
//
// Initializes a Paystack transaction for subscription authorization.
// Returns an authorization URL that the frontend uses to open Paystack Inline Checkout.
//
// Deploy with: supabase functions deploy initialize-payment
// Requires secret: PAYSTACK_SECRET_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PLAN_PRICING: Record<string, number> = {
  regular: 10000,
  'multi-leader': 15000,
  district: 20000,
  zone: 50000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const { planId } = await req.json();
    if (!planId || !PLAN_PRICING[planId]) {
      return json({ error: `Invalid plan: ${planId}` }, 400);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: `Auth failed: ${userErr?.message}` }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles").select("church_id, role, full_name, phone").eq("id", user.id).single();
    if (profileErr || !profile) return json({ error: `Profile error: ${profileErr?.message}` }, 403);
    if (!["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: `Role not allowed: ${profile.role}` }, 403);
    }

    const { data: existingPlan } = await supabaseAdmin
      .from("paystack_plans").select("plan_code, amount, name").eq("plan_id", planId).single();
    if (!existingPlan) return json({ error: `No plan found for ${planId}` }, 400);

    // Create or get customer
    const customerRes = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        first_name: profile.full_name?.split(" ")[0] || "",
        last_name: profile.full_name?.split(" ").slice(1).join(" ") || "",
        phone: profile.phone || "",
      }),
    });
    const customerData = await customerRes.json();
    let customerCode: string;
    if (!customerRes.ok || !customerData.status) {
      if (customerData.message?.includes("already exists")) {
        const listRes = await fetch(`https://api.paystack.co/customer?email=${encodeURIComponent(user.email)}`, {
          headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
        });
        const listData = await listRes.json();
        if (listData.status && listData.data?.length > 0) {
          customerCode = listData.data[0].customer_code;
        } else {
          return json({ error: `Customer lookup failed` }, 400);
        }
      } else {
        return json({ error: `Customer creation failed: ${customerData.message}` }, 400);
      }
    } else {
      customerCode = customerData.data.customer_code;
    }

    // Initialize transaction to get authorization URL
    const amount = existingPlan.amount; // in kobo
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: amount,
        callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-callback`,
        metadata: {
          church_id: profile.church_id,
          plan_id: planId,
          customer_code: customerCode,
        },
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok || !initData.status) {
      return json({ error: `Transaction init failed: ${initData.message || JSON.stringify(initData)}` }, 400);
    }

    return json({
      success: true,
      authorization_url: initData.data.authorization_url,
      access_code: initData.data.access_code,
      reference: initData.data.reference,
      customer_code: customerCode,
    });
  } catch (err) {
    return json({ error: `Unexpected: ${String(err)}` }, 500);
  }
});
