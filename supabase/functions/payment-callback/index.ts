// supabase/functions/payment-callback/index.ts
//
// Paystack redirects here after a successful payment.
// We verify the transaction and create the subscription.
//
// Deploy with: supabase functions deploy payment-callback --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const PLAN_HIERARCHY: Record<string, { level: string; defaultTerminology: string; maxMembers: number }> = {
  regular:       { level: 'branch',  defaultTerminology: 'District', maxMembers: 200 },
  'multi-leader': { level: 'branch',  defaultTerminology: 'District', maxMembers: 5000 },
  district:      { level: 'district', defaultTerminology: 'District', maxMembers: 5000 },
  zone:          { level: 'zone',     defaultTerminology: 'District', maxMembers: 10000 },
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");
  const trxref = url.searchParams.get("trxref");

  if (!reference && !trxref) {
    return new Response("Missing reference", { status: 400 });
  }

  const ref = reference || trxref;
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify the transaction with Paystack
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
  });
  const verifyData = await verifyRes.json();

  if (!verifyRes.ok || !verifyData.status || verifyData.data.status !== "success") {
    return new Response("Payment verification failed", { status: 400 });
  }

  const metadata = verifyData.data.metadata;
  const { church_id, plan_id, customer_code } = metadata;

  if (!church_id || !plan_id || !customer_code) {
    return new Response("Missing metadata", { status: 400 });
  }

  // Get the plan code
  const { data: plan } = await supabaseAdmin
    .from("paystack_plans")
    .select("plan_code")
    .eq("plan_id", plan_id)
    .single();

  if (!plan) {
    return new Response("Plan not found", { status: 400 });
  }

  // Create subscription
  const subRes = await fetch("https://api.paystack.co/subscription", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: customer_code,
      plan: plan.plan_code,
    }),
  });
  const subData = await subRes.json();

  if (!subRes.ok || !subData.status) {
    return new Response("Subscription creation failed", { status: 400 });
  }

  // Get plan hierarchy info
  const planInfo = {
    regular:       { level: 'branch',  defaultTerminology: 'District', maxMembers: 200 },
    'multi-leader': { level: 'branch',  defaultTerminology: 'District', maxMembers: 5000 },
    district:      { level: 'district', defaultTerminology: 'District', maxMembers: 5000 },
    zone:          { level: 'zone',     defaultTerminology: 'District', maxMembers: 10000 },
  }[plan_id] || { level: 'branch', defaultTerminology: 'District', maxMembers: 200 };

  // Update church record
  await supabaseAdmin.from("churches").update({
    plan: plan_id,
    paystack_plan_code: plan.plan_code,
    paystack_subscription_code: subData.data.subscription_code,
    paystack_email_token: subData.data.email_token,
    subscription_status: "active",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    hierarchy_level: planInfo.level,
    terminology: planInfo.defaultTerminology,
    max_members: planInfo.maxMembers,
  }).eq("id", church_id);

  // Log billing event
  await supabaseAdmin.from("billing_events").insert({
    church_id: church_id,
    event_type: "subscription_created",
    description: `Subscription created for ${plan_id} plan`,
    metadata: { plan: plan_id, subscription_code: subData.data.subscription_code, customer_code },
  });

  // Redirect to frontend billing page with success
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
  return Response.redirect(`${frontendUrl}/billing?subscription=success`, 302);
});