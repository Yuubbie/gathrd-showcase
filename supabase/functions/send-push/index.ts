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

// Only same-site paths: "/x" is fine, "//evil.com" and "/\evil.com" are not.
function safePath(value: string): string {
  const second = value.charCodeAt(1); // 47 is "/", 92 is a backslash
  return value.charCodeAt(0) === 47 && second !== 47 && second !== 92 ? value : "/dashboard";
}

function asString(value: unknown, max = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function normalizePrivate(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 32) return bytes;
  if (bytes.length === 33 && bytes[0] === 0) return bytes.slice(1);
  if (bytes.length > 32) return bytes.slice(bytes.length - 32);
  throw new Error("bad vapid private");
}

async function hkdf(
  ikm: BufferSource,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function importEcdhPublic(uncompressed: Uint8Array): Promise<CryptoKey> {
  if (uncompressed.length !== 65 || uncompressed[0] !== 4) throw new Error("bad p256 key");
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToB64url(uncompressed.slice(1, 33)),
      y: bytesToB64url(uncompressed.slice(33, 65)),
      ext: true,
    },
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

async function importVapidSignKey(publicB64: string, privateB64: string): Promise<CryptoKey> {
  const pub = b64urlToBytes(publicB64);
  const priv = normalizePrivate(b64urlToBytes(privateB64));
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("bad vapid public");
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToB64url(pub.slice(1, 33)),
      y: bytesToB64url(pub.slice(33, 65)),
      d: bytesToB64url(priv),
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function vapidJwt(audience: string, sub: string, signKey: CryptoKey): Promise<string> {
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub,
  })));
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signKey, data));
  return `${header}.${payload}.${bytesToB64url(sig)}`;
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string,
): Promise<Uint8Array> {
  const uaPublicBytes = b64urlToBytes(p256dh);
  const authSecret = b64urlToBytes(auth);
  const uaPublic = await importEcdhPublic(uaPublicBytes);

  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: uaPublic }, local.privateKey, 256);

  const info = concatBytes(
    new TextEncoder().encode("WebPush: info\0"),
    uaPublicBytes,
    asPublic,
  );
  const ikm = await hkdf(shared, authSecret, info, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const plain = new TextEncoder().encode(payload);
  const padded = new Uint8Array(plain.length + 1);
  padded.set(plain);
  padded[plain.length] = 2;

  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 },
    cekKey,
    padded,
  ));

  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concatBytes(header, encrypted);
}

async function sendOne(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublic: string,
  signKey: CryptoKey,
): Promise<number> {
  const body = await encryptPayload(payload, p256dh, auth);
  const audience = new URL(endpoint).origin;
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:gathrdng@gmail.com";
  const jwt = await vapidJwt(audience, subject, signKey);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublic.replace(/=+$/, "")}`,
      "Crypto-Key": `p256ecdsa=${vapidPublic.replace(/=+$/, "")}`,
      TTL: "43200",
      Urgency: "high",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
    },
    body,
  });
  return res.status;
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
    const selfTest = body.self_test === true;
    let profileIds = Array.isArray(body.profile_ids)
      ? body.profile_ids.filter((id: unknown) => typeof id === "string")
      : [];
    const memberIds = Array.isArray(body.member_ids)
      ? body.member_ids.filter((id: unknown) => typeof id === "string")
      : [];

    // A request that names recipients (even an empty list) is targeted and must
    // never fall back to a church-wide broadcast.
    const targeted = Array.isArray(body.profile_ids) || Array.isArray(body.member_ids) || selfTest;

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

      if (selfTest) {
        churchId = profile.church_id;
        profileIds = [user.id];
      } else {
        const allowed = ["senior_pastor", "assistant_pastor", "church_admin", "media_team"];
        if (!allowed.includes(profile.role)) return json({ error: "Not authorized" }, 403);
        churchId = profile.church_id;
      }
    } else if (selfTest) {
      return json({ error: "self_test requires a user session" }, 400);
    }

    if (!churchId) return json({ error: "Missing church_id" }, 400);

    const PAGE = 1000;
    const IN_CHUNK = 100;
    let targetProfiles: string[] = profileIds;

    if (!selfTest && memberIds.length) {
      for (let i = 0; i < memberIds.length; i += IN_CHUNK) {
        const { data: members, error: memErr } = await supabaseAdmin
          .from("members")
          .select("profile_id")
          .eq("church_id", churchId)
          .in("id", memberIds.slice(i, i + IN_CHUNK))
          .not("profile_id", "is", null);
        if (memErr) return json({ error: "Could not load recipients" }, 500);
        targetProfiles = [
          ...targetProfiles,
          ...(members || []).map((m: { profile_id: string }) => m.profile_id),
        ];
      }
    }

    const uniqueProfiles = [...new Set(targetProfiles)];

    // Targeted but nobody to notify (e.g. members without a login): send nothing.
    if (targeted && uniqueProfiles.length === 0) {
      return json({ ok: true, sent: 0, total: 0, reason: "no_recipients" });
    }

    const selectCols = "id, endpoint, p256dh, auth, profile_id";
    const rows: { id: string; endpoint: string; p256dh: string; auth: string; profile_id: string }[] = [];

    if (targeted) {
      for (let i = 0; i < uniqueProfiles.length; i += IN_CHUNK) {
        const { data, error: subErr } = await supabaseAdmin
          .from("push_subscriptions")
          .select(selectCols)
          .eq("church_id", churchId)
          .is("deleted_at", null)
          .in("profile_id", uniqueProfiles.slice(i, i + IN_CHUNK));
        if (subErr) return json({ error: "Could not load subscriptions" }, 500);
        rows.push(...(data || []));
      }
    } else {
      for (let from = 0; ; from += PAGE) {
        const { data, error: subErr } = await supabaseAdmin
          .from("push_subscriptions")
          .select(selectCols)
          .eq("church_id", churchId)
          .is("deleted_at", null)
          .order("id")
          .range(from, from + PAGE - 1);
        if (subErr) return json({ error: "Could not load subscriptions" }, 500);
        rows.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }
    }

    if (!rows.length) return json({ ok: true, sent: 0, total: 0, reason: "no_subscriptions" });

    const signKey = await importVapidSignKey(vapidPublic, vapidPrivate);
    const payload = JSON.stringify({
      title,
      body: text,
      url: safePath(url),
      tag,
    });

    let sent = 0;
    let lastStatus = 0;
    const BATCH = 8;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const results = await Promise.all(chunk.map(async (row) => {
        try {
          const status = await sendOne(row.endpoint, row.p256dh, row.auth, payload, vapidPublic, signKey);
          return { id: row.id, status };
        } catch {
          return { id: row.id, status: 0 };
        }
      }));
      for (const r of results) {
        lastStatus = r.status;
        if (r.status >= 200 && r.status < 300) {
          sent += 1;
        } else if (r.status === 404 || r.status === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", r.id);
        }
      }
    }

    return json({ ok: true, sent, total: rows.length, last_status: lastStatus });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
