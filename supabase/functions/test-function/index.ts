// supabase/functions/test-function/index.ts
// Simple test function to verify edge functions work

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  if (req.method === "GET") {
    return json({ message: "Test function works!", timestamp: new Date().toISOString() });
  }

  if (req.method === "POST") {
    const body = await req.json();
    return json({ received: body, message: "POST works!" });
  }

  return json({ error: "Method not allowed" }, 405);
});