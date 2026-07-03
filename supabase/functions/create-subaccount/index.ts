// supabase/functions/create-subaccount/index.ts
//
// Called by a logged-in pastor/admin from the Giving Settings page,
// once they've entered their church's settlement bank details.
//
// This function holds the Paystack SECRET key — it must never be
// exposed to the frontend. It:
//   1. Verifies the caller is a pastor/admin of a real church
//   2. Creates a Paystack Subaccount for that church
//   3. Saves the subaccount_code back onto the church record
//
// Deploy with: supabase functions deploy create-subaccount
// Requires secret: PAYSTACK_SECRET_KEY (set via `supabase secrets set`)

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
    }

    // Client scoped to the calling user's own JWT — lets us safely
    // check "who is this person" using their own session.
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    // Service-role client for privileged writes, only after we've
    // confirmed who the caller is above.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("church_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 403 });
    }

    if (!["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Not authorized to set up giving" }), { status: 403 });
    }

    const { data: church, error: churchErr } = await supabaseAdmin
      .from("churches")
      .select("id, name, settlement_bank_code, settlement_account_number")
      .eq("id", profile.church_id)
      .single();

    if (churchErr || !church) {
      return new Response(JSON.stringify({ error: "Church not found" }), { status: 404 });
    }

    if (!church.settlement_bank_code || !church.settlement_account_number) {
      return new Response(
        JSON.stringify({ error: "Save your bank account details before creating the subaccount." }),
        { status: 400 }
      );
    }

    // Call Paystack — this is the only place the secret key is used
    const paystackRes = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: church.name,
        settlement_bank: church.settlement_bank_code,
        account_number: church.settlement_account_number,
        percentage_charge: 2, // Gathrd's platform fee — adjust as needed
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return new Response(
        JSON.stringify({ error: paystackData.message || "Paystack rejected the subaccount request." }),
        { status: 400 }
      );
    }

    const subaccountCode = paystackData.data.subaccount_code;
    const accountName = paystackData.data.account_name;

    await supabaseAdmin
      .from("churches")
      .update({
        paystack_subaccount_code: subaccountCode,
        settlement_account_name: accountName,
      })
      .eq("id", church.id);

    return new Response(
      JSON.stringify({ success: true, subaccount_code: subaccountCode, account_name: accountName }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
