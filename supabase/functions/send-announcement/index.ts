// supabase/functions/send-announcement/index.ts
//
// Called by a pastor/admin after creating (or scheduling) an
// announcement. Resolves the target audience, sends via Termii's
// WhatsApp API if TERMII_API_KEY is configured, and records a
// recipient row either way — so read-receipt counts are honest
// even before WhatsApp sending is switched on.
//
// Deploy with: supabase functions deploy send-announcement

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

    const { announcement_id } = await req.json();
    if (!announcement_id) return json({ error: "Missing announcement_id" }, 400);

    const { data: announcement, error: annErr } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("id", announcement_id)
      .eq("church_id", profile.church_id)
      .single();

    if (annErr || !announcement) return json({ error: "Announcement not found" }, 404);
    if (announcement.sent_at) return json({ error: "Already sent" }, 400);

    // Resolve target audience
    let members: { id: string; full_name: string; phone: string | null }[] = [];

    if (announcement.target_type === "all") {
      const { data } = await supabaseAdmin
        .from("members")
        .select("id, full_name, phone")
        .eq("church_id", profile.church_id)
        .is("deleted_at", null)
        .eq("status", "active");
      members = data || [];
    } else if (announcement.target_type === "department" && announcement.target_department_id) {
      const { data } = await supabaseAdmin
        .from("member_departments")
        .select("members(id, full_name, phone)")
        .eq("department_id", announcement.target_department_id);
      members = (data || []).map((r: any) => r.members).filter(Boolean);
    } else if (announcement.target_type === "cell_group" && announcement.target_cell_group_id) {
      const { data } = await supabaseAdmin
        .from("members")
        .select("id, full_name, phone")
        .eq("cell_group_id", announcement.target_cell_group_id)
        .is("deleted_at", null)
        .eq("status", "active");
      members = data || [];
    }

    let sentCount = 0;
    let notConfiguredCount = 0;

    for (const m of members) {
      let status = "no_phone";
      if (announcement.send_via_whatsapp && m.phone) {
        const message = `${announcement.title}\n\n${announcement.body}`;
        status = await sendWhatsApp(m.phone, message);
        if (status === "sent") sentCount++;
        if (status === "not_configured") notConfiguredCount++;
      } else if (!announcement.send_via_whatsapp) {
        status = "not_configured"; // WhatsApp channel deliberately off for this announcement
      }

      await supabaseAdmin.from("announcement_recipients").insert({
        announcement_id,
        member_id: m.id,
        phone_snapshot: m.phone,
        whatsapp_status: status,
      });
    }

    await supabaseAdmin
      .from("announcements")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", announcement_id);

    return json({
      success: true,
      total_recipients: members.length,
      sent: sentCount,
      not_configured: notConfiguredCount,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
