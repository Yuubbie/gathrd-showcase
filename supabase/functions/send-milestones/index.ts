// supabase/functions/send-milestones/index.ts
//
// Manually triggered today (via a "Check & Send Today's Milestones"
// button); designed so it can later be put on a schedule (Supabase
// Cron / pg_cron) without changing any of this logic — it's already
// idempotent: the unique constraint on milestone_messages_log means
// running this twice in one day never double-sends anyone.
//
// Deploy with: supabase functions deploy send-milestones

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Run a push call without blocking the response, but keep the edge runtime
// alive until it finishes so the alert is not dropped.
function keepAlive(promise: Promise<unknown>) {
  const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(promise);
  return promise;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEFAULT_TEMPLATES: Record<string, string> = {
  birthday: "Happy Birthday {{name}}! 🎉 The entire {{church_name}} family celebrates you today. God bless you richly.",
  wedding_anniversary: "Happy Anniversary {{name}}! 🎊 {{church_name}} celebrates your union today. Wishing you many more joyful years together.",
  born_again_anniversary: "Happy Spiritual Birthday {{name}}! 🙏 {{church_name}} celebrates the day you gave your life to Christ.",
};

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

    const { data: church } = await supabaseAdmin
      .from("churches")
      .select("name")
      .eq("id", profile.church_id)
      .single();

    const { data: templates } = await supabaseAdmin
      .from("message_templates")
      .select("template_type, body_text")
      .eq("church_id", profile.church_id);

    const templateMap: Record<string, string> = { ...DEFAULT_TEMPLATES };
    for (const t of templates || []) {
      templateMap[t.template_type] = t.body_text;
    }

    const milestoneTypes = ["birthday", "wedding_anniversary", "born_again_anniversary"];
    let totalSent = 0;
    const pushJobs: Promise<unknown>[] = [];
    let totalSkippedAlreadySent = 0;

    for (const milestone of milestoneTypes) {
      const { data: matches } = await supabaseAdmin.rpc("get_members_with_milestone_today", {
        p_church_id: profile.church_id,
        p_milestone: milestone,
      });

      for (const m of matches || []) {
        // Check if already sent today (belt-and-suspenders on top of the unique constraint)
        const { data: existing } = await supabaseAdmin
          .from("milestone_messages_log")
          .select("id")
          .eq("member_id", m.member_id)
          .eq("milestone_type", milestone)
          .eq("sent_on", new Date().toISOString().slice(0, 10))
          .maybeSingle();

        if (existing) {
          totalSkippedAlreadySent++;
          continue;
        }

        let status = "no_phone";
        const message = templateMap[milestone]
          .replace("{{name}}", m.full_name)
          .replace("{{church_name}}", church?.name || "your church");
        if (m.phone) {
          status = await sendWhatsApp(m.phone, message);
          if (status === "sent") totalSent++;
        }
        pushJobs.push(fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            church_id: profile.church_id,
            title: "Gathrd",
            body: message.replace(/🎉|🎊|🙏/g, "").trim(),
            url: "/dashboard",
            tag: `milestone-${m.member_id}`,
            member_ids: [m.member_id],
          }),
        }).catch((e) => console.error("send-push failed", String(e))));

        await supabaseAdmin.from("milestone_messages_log").insert({
          church_id: profile.church_id,
          member_id: m.member_id,
          milestone_type: milestone,
          whatsapp_status: status,
          sent_by: user.id,
        });
      }
    }

    keepAlive(Promise.allSettled(pushJobs));
    return json({ success: true, sent: totalSent, skipped_already_sent: totalSkippedAlreadySent });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
