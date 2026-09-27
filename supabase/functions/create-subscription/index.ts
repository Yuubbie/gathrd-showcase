// supabase/functions/create-subscription/index.ts
//
// Creates a Paystack subscription for a church.
// Called when a user selects a plan after trial (or immediately).
//
// Deploy with: supabase functions deploy create-subscription
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
  basic: 10000,
  advanced: 20000,
  premium: 50000,
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
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const { planId } = await req.json();
    if (!planId || !PLAN_PRICING[planId]) {
      return json({ error: "Invalid plan. Must be: basic, advanced, or premium" }, 400);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get church and profile info
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("church_id, role, full_name, phone")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return json({ error: "Profile not found" }, 403);
    }

    // Only pastors/admins can subscribe
    if (!["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: "Only pastors or church admins can manage billing" }, 403);
    }

    // Check if there's an existing Paystack plan code for this tier
    const { data: existingPlan } = await supabaseAdmin
      .from("paystack_plans")
      .select("plan_code")
      .eq("plan_id", planId)
      .single();

    if (!existingPlan) {
      return json({ error: "Paystack plan not configured. Please contact support." }, 400);
    }

    // Create or get customer on Paystack
    const customerRes = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        first_name: profile.full_name?.split(" ")[0] || "",
        last_name: profile.full_name?.split(" ").slice(1).join(" ") || "",
        phone: profile.phone || "",
      }),
    });

    const customerData = await customerRes.json();
    if (!customerRes.ok || !customerData.status) {
      return json({ error: customerData.message || "Failed to create customer" }, 400);
    }

    const customerCode = customerData.data.customer_code;

    // Create subscription
    const subRes = await fetch("https://api.paystack.co/subscription", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerCode,
        plan: existingPlan.plan_code,
      }),
    });

    const subData = await subRes.json();
    if (!subRes.ok || !subData.status) {
      return json({ error: subData.message || "Failed to create subscription" }, 400);
    }

    // Update church record
    await supabaseAdmin
      .from("churches")
      .update({
        plan: planId,
        paystack_plan_code: existingPlan.plan_code,
        paystack_subscription_code: subData.data.subscription_code,
        paystack_email_token: subData.data.email_token,
        subscription_status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", profile.church_id);

    // Log billing event
    await supabaseAdmin
      .from("billing_events")
      .insert({
        church_id: profile.church_id,
        event_type: "subscription_created",
        description: `Subscription created for ${planId} plan`,
        metadata: {
          plan: planId,
          subscription_code: subData.data.subscription_code,
          customer_code: customerCode,
        },
      });

    return json({
      success: true,
      subscription_code: subData.data.subscription_code,
      status: subData.data.status,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
