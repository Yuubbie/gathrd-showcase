// supabase/functions/create-subscription/index.ts
//
// Creates a Paystack subscription for a church.
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
  regular: 10000,
  'multi-leader': 15000,
  district: 20000,
  zone: 50000,
};

const PLAN_HIERARCHY: Record<string, { level: string; defaultTerminology: string; maxMembers: number }> = {
  regular:       { level: 'branch',  defaultTerminology: 'District', maxMembers: 200 },
  'multi-leader': { level: 'branch',  defaultTerminology: 'District', maxMembers: 5000 },
  district:      { level: 'district', defaultTerminology: 'District', maxMembers: 5000 },
  zone:          { level: 'zone',     defaultTerminology: 'District', maxMembers: 10000 },
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
      return json({ error: `Invalid plan: ${planId}. Must be regular, multi-leader, district, or zone` }, 400);
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
      .from("paystack_plans").select("plan_code").eq("plan_id", planId).single();
    if (!existingPlan) return json({ error: `No plan found for ${planId}` }, 400);

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
          return json({ error: `Customer lookup failed: ${JSON.stringify(listData)}` }, 400);
        }
      } else {
        return json({ error: `Customer creation failed: ${customerData.message || JSON.stringify(customerData)}` }, 400);
      }
    } else {
      customerCode = customerData.data.customer_code;
    }

    const subRes = await fetch("https://api.paystack.co/subscription", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ customer: customerCode, plan: existingPlan.plan_code }),
    });
    const subData = await subRes.json();
    if (!subRes.ok || !subData.status) {
      return json({ error: `Subscription failed: ${subData.message || JSON.stringify(subData)}` }, 400);
    }

    // Get plan hierarchy info
    const planInfo = PLAN_HIERARCHY[planId];

    await supabaseAdmin.from("churches").update({
      plan: planId,
      paystack_plan_code: existingPlan.plan_code,
      paystack_subscription_code: subData.data.subscription_code,
      paystack_email_token: subData.data.email_token,
      subscription_status: "active",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      hierarchy_level: planInfo.level,
      terminology: planInfo.defaultTerminology,
      max_members: planInfo.maxMembers,
    }).eq("id", profile.church_id);

    await supabaseAdmin.from("billing_events").insert({
      church_id: profile.church_id,
      event_type: "subscription_created",
      description: `Subscription created for ${planId}`,
      metadata: { plan: planId, subscription_code: subData.data.subscription_code, customer_code: customerCode },
    });

    return json({ success: true, subscription_code: subData.data.subscription_code, status: subData.data.status });
  } catch (err) {
    return json({ error: `Unexpected: ${String(err)}` }, 500);
  }
});