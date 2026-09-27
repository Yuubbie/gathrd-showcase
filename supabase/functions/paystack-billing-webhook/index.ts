// supabase/functions/paystack-billing-webhook/index.ts
//
// Paystack calls this when subscription events happen:
// - subscription.success: payment succeeded
// - subscription.disable: subscription cancelled/expired
// - invoice.payment_failed: payment failed
//
// Deploy with: supabase functions deploy paystack-billing-webhook --no-verify-jwt
// Register URL in Paystack Dashboard: Settings -> API Keys & Webhooks -> Webhook URL

import { createClient } from "npm:@supabase/supabase-js@2";

async function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

  const isValid = await verifySignature(rawBody, signature, secretKey);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const subscriptionCode = event.data?.subscription_code;
  if (!subscriptionCode) {
    return new Response("OK", { status: 200 });
  }

  // Find the church by subscription code
  const { data: church } = await supabaseAdmin
    .from("churches")
    .select("id, subscription_status")
    .eq("paystack_subscription_code", subscriptionCode)
    .single();

  if (!church) {
    return new Response("OK", { status: 200 });
  }

  switch (event.event) {
    case "subscription.success": {
      // Payment succeeded — extend period by 30 days
      const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      await supabaseAdmin
        .from("churches")
        .update({
          subscription_status: "active",
          current_period_end: newPeriodEnd,
          grace_period_started_at: null,
        })
        .eq("id", church.id);

      await supabaseAdmin.from("billing_events").insert({
        church_id: church.id,
        event_type: "payment_succeeded",
        description: "Subscription payment succeeded",
        metadata: { subscription_code: subscriptionCode },
      });
      break;
    }

    case "subscription.disable": {
      // Subscription cancelled or expired — start grace period
      await supabaseAdmin
        .from("churches")
        .update({
          subscription_status: "grace_period",
          grace_period_started_at: new Date().toISOString(),
        })
        .eq("id", church.id);

      await supabaseAdmin.from("billing_events").insert({
        church_id: church.id,
        event_type: "subscription_disabled",
        description: "Subscription disabled — grace period started",
        metadata: { subscription_code: subscriptionCode },
      });
      break;
    }

    case "invoice.payment_failed": {
      // Payment failed — start grace period (3 days)
      const graceEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      
      await supabaseAdmin
        .from("churches")
        .update({
          subscription_status: "grace_period",
          grace_period_started_at: new Date().toISOString(),
        })
        .eq("id", church.id);

      await supabaseAdmin.from("billing_events").insert({
        church_id: church.id,
        event_type: "payment_failed",
        description: "Subscription payment failed — grace period started",
        metadata: { subscription_code: subscriptionCode },
      });
      break;
    }

    case "invoice.create": {
      // New invoice generated — log it
      await supabaseAdmin.from("billing_events").insert({
        church_id: church.id,
        event_type: "invoice_created",
        description: "New invoice generated",
        metadata: {
          subscription_code: subscriptionCode,
          amount: event.data?.amount,
        },
      });
      break;
    }
  }

  return new Response("OK", { status: 200 });
});
