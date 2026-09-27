// supabase/functions/check-billing-status/index.ts
//
// Returns the current billing status for the logged-in user's church.
// Called on app load to determine if the church can access the app.
//
// Deploy with: supabase functions deploy check-billing-status

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  if (req.method !== "GET") {
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

    // Get profile to find church
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("church_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.church_id) {
      return json({ error: "No church associated with this account" }, 403);
    }

    // Get billing status
    const { data: status, error: statusErr } = await supabaseAdmin
      .rpc("get_billing_status", { church_id: profile.church_id });

    if (statusErr) {
      return json({ error: "Failed to get billing status" }, 500);
    }

    // Also get recent billing events
    const { data: events } = await supabaseAdmin
      .from("billing_events")
      .select("event_type, description, created_at")
      .eq("church_id", profile.church_id)
      .order("created_at", { ascending: false })
      .limit(5);

    return json({
      success: true,
      ...status,
      recent_events: events || [],
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
