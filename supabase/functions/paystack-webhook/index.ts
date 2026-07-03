// supabase/functions/paystack-webhook/index.ts
//
// Paystack calls this automatically after every transaction. We
// verify the request truly came from Paystack (not someone faking
// a "payment succeeded" call) before trusting it.
//
// Deploy with: supabase functions deploy paystack-webhook --no-verify-jwt
// Then register this function's URL in your Paystack Dashboard:
// Settings -> API Keys & Webhooks -> Webhook URL

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
    // Do not process anything from a request we can't verify.
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.event === "charge.success") {
    const reference = event.data.reference;
    const paidAt = event.data.paid_at || new Date().toISOString();

    await supabaseAdmin
      .from("giving_records")
      .update({ status: "success", given_at: paidAt })
      .eq("paystack_reference", reference);
  }

  if (event.event === "charge.failed") {
    const reference = event.data.reference;
    await supabaseAdmin
      .from("giving_records")
      .update({ status: "failed" })
      .eq("paystack_reference", reference);
  }

  // Always return 200 quickly so Paystack doesn't retry unnecessarily
  return new Response("OK", { status: 200 });
});
