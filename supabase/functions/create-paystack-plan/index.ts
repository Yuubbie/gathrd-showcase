// supabase/functions/create-paystack-plan/index.ts
//
// Creates a Paystack plan for a given tier (basic, advanced, premium).
// Called once during setup to ensure plans exist in Paystack.
//
// Deploy with: supabase functions deploy create-paystack-plan
// Requires secret: PAYSTACK_SECRET_KEY

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
  regular:       { amount: 10000 * 100, name: "Regular",       interval: "monthly" },  // ₦10,000 (kobo)
  'multi-leader': { amount: 15000 * 100, name: "Multi-Leader",  interval: "monthly" },  // ₦15,000 (kobo)
  district:      { amount: 20000 * 100, name: "District",      interval: "monthly" },  // ₦20,000 (kobo)
  zone:          { amount: 50000 * 100, name: "Zone",          interval: "monthly" },  // ₦50,000 (kobo)
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { planId } = await req.json();
    if (!planId || !PLAN_PRICING[planId]) {
      return json({ error: "Invalid plan. Must be: basic, advanced, or premium" }, 400);
    }

    const plan = PLAN_PRICING[planId];
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

    // Create or get existing plan
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
