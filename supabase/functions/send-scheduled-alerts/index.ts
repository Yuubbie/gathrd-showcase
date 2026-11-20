// supabase/functions/send-scheduled-alerts/index.ts
//
// Runs every 15 minutes (pg_cron). For every church that has switched alerts on:
//   - sends the two reminders before each activity (e.g. Bible Study at 6 pm)
//   - sends one "birthday celebrants today" notice at the church's chosen hour
//
// Each alert is written to the notifications feed (shown in the bell) and sent as
// a phone push. A unique key per church/alert/day makes repeat runs harmless.
// Times are West Africa Time (Africa/Lagos).
//
// Deploy with: supabase functions deploy send-scheduled-alerts
// Needs secrets: CRON_SECRET (plus the usual Supabase ones)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Keep the edge runtime alive until background push calls finish.
function keepAlive(promise: Promise<unknown>) {
  const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(promise);
  return promise;
}

// How long after its exact minute an alert may still go out (covers one missed run).
const CATCH_UP_MINUTES = 30;

function lagosNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    hour: Number(get("hour")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function formatTime(hhmmss: string) {
  const [h, m] = hhmmss.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

type Alert = { churchId: string; key: string; kind: string; title: string; body: string; tag: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Not authenticated" }, 401);
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const now = lagosNow();
    const alerts: Alert[] = [];

    // 1. Activity reminders (one query for every church).
    const { data: activities, error: actErr } = await admin
      .from("church_alert_activities")
      .select("id, church_id, name, start_time, alert_1_minutes_before, alert_2_minutes_before")
      .eq("enabled", true)
      .eq("weekday", now.weekday)
      .is("deleted_at", null);
    if (actErr) throw actErr;

    for (const a of activities || []) {
      const [h, m] = String(a.start_time).split(":").map(Number);
      const startMin = h * 60 + m;
      const when = formatTime(String(a.start_time));
      const slots: [number, number | null][] = [
        [1, a.alert_1_minutes_before],
        [2, a.alert_2_minutes_before],
      ];
      for (const [slot, offset] of slots) {
        if (!offset) continue;
        const trigger = startMin - offset;
        if (trigger < 0) continue; // would fall on the previous day; not supported
        if (now.minutes >= trigger && now.minutes < trigger + CATCH_UP_MINUTES && now.minutes < startMin) {
          alerts.push({
            churchId: a.church_id,
            key: `activity:${a.id}:${now.date}:${slot}`,
            kind: "activity",
            title: slot === 1 ? `${a.name} today` : `${a.name} is almost here`,
            body: slot === 1
              ? `${a.name} holds today at ${when}. Plan to be there.`
              : `${a.name} starts at ${when}. See you there!`,
            tag: `activity-${a.id}-${slot}`,
          });
        }
      }
    }

    // 2. Birthday celebrants (churches that switched it on, at their chosen hour).
    const { data: bdaySettings, error: setErr } = await admin
      .from("church_alert_settings")
      .select("church_id")
      .eq("birthday_enabled", true)
      .eq("birthday_hour", now.hour);
    if (setErr) throw setErr;

    for (const s of bdaySettings || []) {
      const { data: people, error: bErr } = await admin.rpc("birthday_members", {
        p_church_id: s.church_id,
        p_month: now.month,
        p_day: now.day,
      });
      if (bErr || !people?.length) continue;
      const names = (people as { full_name: string }[]).map((p) => p.full_name);
      const shown = names.slice(0, 3);
      const more = names.length - shown.length;
      const list = more > 0
        ? `${shown.join(", ")} and ${more} other${more > 1 ? "s" : ""}`
        : shown.length > 1
        ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`
        : shown[0];
      alerts.push({
        churchId: s.church_id,
        key: `birthday:${now.date}`,
        kind: "birthday",
        title: "Birthday celebrants today 🎂",
        body: `Today we celebrate ${list}. Send them your blessings!`,
        tag: `birthday-${now.date}`,
      });
    }

    // 3. Record each alert once, then push it to the whole church.
    const pushJobs: Promise<unknown>[] = [];
    let fired = 0;
    for (const al of alerts) {
      const { error: insErr } = await admin.from("church_notifications").insert({
        church_id: al.churchId,
        kind: al.kind,
        title: al.title,
        body: al.body,
        url: "/dashboard",
        dedupe_key: al.key,
      });
      if (insErr) {
        if (insErr.code !== "23505") console.error("church notification insert failed", al.key, insErr.message);
        continue; // already sent (unique key) or could not record
      }
      fired++;
      pushJobs.push(
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            church_id: al.churchId,
            title: al.title,
            body: al.body,
            url: "/dashboard",
            tag: al.tag,
          }),
        }).catch((e) => console.error("send-push failed", String(e))),
      );
    }
    keepAlive(Promise.allSettled(pushJobs));

    return json({ success: true, checked_at: now.date, candidates: alerts.length, fired });
  } catch (err) {
    console.error("send-scheduled-alerts failed", String(err));
    return json({ error: String(err) }, 500);
  }
});
