import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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

function asString(value: unknown, max = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidPublic || !vapidPrivate) {
    return json({ ok: false, error: "not_configured", sent: 0 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const isService = Boolean(serviceKey) && token === serviceKey;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const title = asString(body.title, 80) || "Gathrd";
    const text = asString(body.body, 240);
    const url = asString(body.url, 200) || "/dashboard";
    const tag = asString(body.tag, 80);
    const profileIds = Array.isArray(body.profile_ids) ? body.profile_ids.filter((id: unknown) => typeof id === "string") : [];
    const memberIds = Array.isArray(body.member_ids) ? body.member_ids.filter((id: unknown) => typeof id === "string") : [];

    let churchId = typeof body.church_id === "string" ? body.church_id : "";

    if (!isService) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !user) return json({ error: "Not authenticated" }, 401);

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("church_id, role")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) return json({ error: "Not authorized" }, 403);
      const allowed = ["senior_pastor", "assistant_pastor", "church_admin", "media_team"];
      if (!allowed.includes(profile.role)) return json({ error: "Not authorized" }, 403);
      churchId = profile.church_id;
    }

    if (!churchId) return json({ error: "Missing church_id" }, 400);

    let targetProfiles = profileIds;

    if (memberIds.length) {
      const { data: members } = await supabaseAdmin
        .from("members")
        .select("profile_id")
        .eq("church_id", churchId)
        .in("id", memberIds.slice(0, 2000))
        .not("profile_id", "is", null);
      targetProfiles = [
        ...targetProfiles,
        ...(members || []).map((m: { profile_id: string }) => m.profile_id),
      ];
    }

    let query = supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, profile_id")
      .eq("church_id", churchId)
      .is("deleted_at", null);

    const uniqueProfiles = [...new Set(targetProfiles)];
    if (uniqueProfiles.length) {
      query = query.in("profile_id", uniqueProfiles.slice(0, 2000));
    }

    const { data: rows, error: subErr } = await query;
    if (subErr) return json({ error: "Could not load subscriptions" }, 500);
    if (!rows?.length) return json({ ok: true, sent: 0, total: 0 });

    webpush.setVapidDetails("mailto:yubbiepen.pixel@gmail.com", vapidPublic, vapidPrivate);

    const payload = JSON.stringify({
      title,
      body: text,
      url: url.startsWith("/") ? url : "/dashboard",
      tag,
    });

    let sent = 0;
    for (const row of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
          { TTL: 60 * 60 * 12 },
        );
        sent += 1;
      } catch (err: any) {
        const status = err?.statusCode || err?.status;
        if (status === 404 || status === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      }
    }

    return json({ ok: true, sent, total: rows.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
