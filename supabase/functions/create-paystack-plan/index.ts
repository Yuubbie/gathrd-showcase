// supabase/functions/create-paystack-plan/index.ts
//
// Creates a Paystack plan for a given tier.
// Login required. Pastors/admins only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const PLAN_PRICING: Record<string, { amount: number; name: string; interval: string }> = {
  regular: { amount: 10000 * 100, name: "Regular", interval: "monthly" },
  "multi-leader": { amount: 15000 * 100, name: "Multi-Leader", interval: "monthly" },
  district: { amount: 20000 * 100, name: "District", interval: "monthly" },
  zone: { amount: 50000 * 100, name: "Zone", interval: "monthly" },
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
    if (!authHeader) return json({ error: "Not authenticated." }, 401);

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated." }, 401);

    const { data: profile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: "Not authorized." }, 403);
    }

    const { planId } = await req.json();
    if (!planId || !PLAN_PRICING[planId]) {
      return json({ error: "Invalid plan." }, 400);
    }

    const plan = PLAN_PRICING[planId];
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) return json({ error: "Paystack is not configured." }, 500);

    const res = await fetch("https://api.paystack.co/plan", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Gathrd ${plan.name} Plan`,
        amount: plan.amount,
        interval: plan.interval,
        description: `Gathrd ${plan.name} - Monthly subscription`,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return json({ error: data.message || "Paystack rejected the plan creation" }, 400);
    }

    return json({
      success: true,
      plan_code: data.data.plan_code,
      name: data.data.name,
      amount: data.data.amount,
      interval: data.data.interval,
      currency: data.data.currency,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
