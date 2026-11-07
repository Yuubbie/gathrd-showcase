// supabase/functions/send-sms/index.ts
// Sends SMS via Termii. Login required. Pastors/admins only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated." }, 401);

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated." }, 401);

    const { data: profile } = await callerClient
      .from("profiles")
      .select("role, church_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: "Not authorized." }, 403);
    }

    const { to, message } = await req.json();

    if (!to || !message) {
      return json({ error: "Missing 'to' or 'message' in request body" }, 400);
    }

    const apiKey = Deno.env.get("TERMII_API_KEY");
    if (!apiKey) {
      return json({ error: "TERMII_API_KEY not configured" }, 500);
    }

    const termiiRes = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from: "Gathrd",
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const data = await termiiRes.json();

    if (!termiiRes.ok) {
      return json({ error: "Termii request failed", details: data }, termiiRes.status);
    }

    return json({ success: true, data });
  } catch (err) {
    return json({ error: "Unexpected error", details: String(err) }, 500);
  }
});
