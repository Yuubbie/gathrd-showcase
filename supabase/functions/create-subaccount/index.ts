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

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("church_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return json({ error: "Profile not found" }, 403);
    }

    if (!["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: "Not authorized to set up giving" }, 403);
    }

    const { data: church, error: churchErr } = await supabaseAdmin
      .from("churches")
      .select("id, name, settlement_bank_code, settlement_account_number")
      .eq("id", profile.church_id)
      .single();

    if (churchErr || !church) {
      return json({ error: "Church not found" }, 404);
    }

    if (!church.settlement_bank_code || !church.settlement_account_number) {
      return json({ error: "Save your bank account details before creating the subaccount." }, 400);
    }

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
        percentage_charge: 2,
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return json({ error: paystackData.message || "Paystack rejected the subaccount request." }, 400);
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

    return json({ success: true, subaccount_code: subaccountCode, account_name: accountName }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});