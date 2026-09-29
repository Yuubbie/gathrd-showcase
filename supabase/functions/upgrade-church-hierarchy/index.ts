// supabase/functions/upgrade-church-hierarchy/index.ts
//
// Manually upgrade a church's hierarchy level (for testing/admin)
// Deploy with: supabase functions deploy upgrade-church-hierarchy

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
    if (!planId || !PLAN_HIERARCHY[planId]) {
      return json({ error: `Invalid plan: ${planId}` }, 400);
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
      .from("profiles").select("church_id, role").eq("id", user.id).single();
    if (profileErr || !profile) return json({ error: `Profile error: ${profileErr?.message}` }, 403);
    if (!["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: `Role not allowed: ${profile.role}` }, 403);
    }

    const planInfo = PLAN_HIERARCHY[planId];

    const { error } = await supabaseAdmin.from("churches").update({
      plan: planId,
      hierarchy_level: planInfo.level,
      terminology: planInfo.defaultTerminology,
      max_members: planInfo.maxMembers,
      subscription_status: "active",
    }).eq("id", profile.church_id);

    if (error) return json({ error: error.message }, 400);

    return json({ success: true, message: `Church upgraded to ${planId} (${planInfo.level})` });
  } catch (err) {
    return json({ error: `Unexpected: ${String(err)}` }, 500);
  }
});