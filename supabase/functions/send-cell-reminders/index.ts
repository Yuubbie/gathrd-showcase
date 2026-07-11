// supabase/functions/send-cell-reminders/index.ts
//
// Manually triggered today (same pattern as send-milestones) —
// finds every cell group whose meeting_day is today, and whose
// leader hasn't yet submitted a report for today's date, then
// sends a WhatsApp reminder via Termii (or logs "not_configured"
// if the key isn't set yet).
//
// Deploy with: supabase functions deploy send-cell-reminders

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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function sendWhatsApp(phone: string, message: string): Promise<string> {
  const apiKey = Deno.env.get("TERMII_API_KEY");
  if (!apiKey) return "not_configured";
  try {
    const res = await fetch("https://api.ng.termii.com/api/send/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: phone,
        from: Deno.env.get("TERMII_SENDER_ID") || "Gathrd",
        sms: message,
        type: "plain",
        channel: "whatsapp",
      }),
    });
    const data = await res.json();
    return res.ok && data.code === "ok" ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("church_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: "Not authorized" }, 403);
    }

    // Compute "today" in West Africa Time (UTC+1, no DST) rather than
    // the server's UTC clock — otherwise a cell group meeting on, say,
    // Saturday could be missed depending on the hour, since UTC and
    // WAT can disagree about which calendar day it currently is.
    const now = new Date();
    const watTime = new Date(now.getTime() + 60 * 60 * 1000);
    const todayName = DAY_NAMES[watTime.getUTCDay()];
    const todayStr = watTime.toISOString().slice(0, 10);

    const { data: cellGroups } = await supabaseAdmin
      .from("cell_groups")
      .select("id, name, leader_profile_id, profiles!cell_groups_leader_profile_id_fkey(full_name, phone)")
      .eq("church_id", profile.church_id)
      .eq("meeting_day", todayName)
      .is("deleted_at", null);

    let sentCount = 0;
    let skippedAlreadyReported = 0;
    const results = [];

    for (const cg of cellGroups || []) {
      const { data: existingReport } = await supabaseAdmin
        .from("cell_group_meeting_reports")
        .select("id")
        .eq("cell_group_id", cg.id)
        .eq("meeting_date", todayStr)
        .maybeSingle();

      if (existingReport) {
        skippedAlreadyReported++;
        continue;
      }

      const leaderPhone = cg.profiles?.phone;
      let status = "no_phone";
      if (leaderPhone) {
        const message = `Hi ${cg.profiles?.full_name || ''}, reminder: today is your ${cg.name} cell meeting day. Please submit your weekly report on Gathrd after the meeting.`;
        status = await sendWhatsApp(leaderPhone, message);
        if (status === "sent") sentCount++;
      }
      results.push({ cell_group: cg.name, status });
    }

    return json({
      success: true,
      checked: (cellGroups || []).length,
      sent: sentCount,
      skipped_already_reported: skippedAlreadyReported,
      details: results,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});