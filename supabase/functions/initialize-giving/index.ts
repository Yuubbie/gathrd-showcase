// supabase/functions/initialize-giving/index.ts
//
// Called from the PUBLIC Give page — no login required, same trust
// model as the Week 2 self-onboarding RPC. Anyone can call this,
// so it only ever trusts the giving_slug, never a raw church_id.
//
// Deploy with: supabase functions deploy initialize-giving --no-verify-jwt
// (--no-verify-jwt because this must work for anonymous givers)

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { slug, category, amount, email, name, phone, origin } = await req.json();

    if (!slug || !category || !amount || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), { status: 400 });
    }

    const validCategories = ["tithe", "offering", "thanksgiving", "building_project", "welfare"];
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: "Invalid giving category." }), { status: 400 });
    }

    const amountNaira = Number(amount);
    if (!Number.isFinite(amountNaira) || amountNaira < 100) {
      return new Response(JSON.stringify({ error: "Minimum gift amount is ₦100." }), { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: church, error: churchErr } = await supabaseAdmin
      .from("churches")
      .select("id, name, paystack_subaccount_code")
      .eq("giving_slug", slug)
      .is("deleted_at", null)
      .single();

    if (churchErr || !church) {
      return new Response(JSON.stringify({ error: "Invalid giving link." }), { status: 404 });
    }

    if (!church.paystack_subaccount_code) {
      return new Response(
        JSON.stringify({ error: "This church hasn't set up online giving yet." }),
        { status: 400 }
      );
    }

    const reference = `gathrd_${crypto.randomUUID()}`;

    // Pre-create a pending giving record BEFORE calling Paystack, so
    // we have a record even if the webhook is delayed or the giver
    // never completes payment.
    await supabaseAdmin.from("giving_records").insert({
      church_id: church.id,
      category,
      amount: amountNaira,
      payment_method: "card",
      source: "paystack",
      paystack_reference: reference,
      status: "pending",
      given_by_name: name || null,
      given_by_phone: phone || null,
    });

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amountNaira * 100), // kobo
        reference,
        subaccount: church.paystack_subaccount_code,
        callback_url: origin ? `${origin}/give/success?reference=${reference}` : undefined,
        metadata: { church_id: church.id, category, given_by_name: name || null },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return new Response(
        JSON.stringify({ error: paystackData.message || "Could not start payment." }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference,
        church_name: church.name,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
