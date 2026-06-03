import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── GET /scan-omr?action=marker&id=0 — retorna imagem ArUco ─────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");
      const markerId = url.searchParams.get("id");

      if (action !== "marker" || markerId === null) {
        return new Response(
          JSON.stringify({ error: "Use ?action=marker&id=0-3" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const omrServiceUrl = Deno.env.get("OMR_SERVICE_URL") || "http://localhost:8000";

      const response = await fetch(
        `${omrServiceUrl}/api/omr/marker/${markerId}?size=200`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Marker generation failed" }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST — envia imagem para o OMR service processar ────────────────────
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { photo, filename, debug } = body;

    if (!photo) {
      return new Response(
        JSON.stringify({ error: "Missing photo data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Converte base64 para blob
    const binaryString = atob(photo);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const formData = new FormData();
    formData.append("photo", new Blob([bytes], { type: "image/jpeg" }), filename || "photo.jpg");
    if (debug) formData.append("debug", "true");

    const omrServiceUrl = Deno.env.get("OMR_SERVICE_URL") || "http://localhost:8000";

    console.log(`[scan-omr] POST → ${omrServiceUrl}/api/omr/scan`);

    const response = await fetch(`${omrServiceUrl}/api/omr/scan`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[scan-omr] Erro:", data);
      return new Response(
        JSON.stringify({ error: data.error || "OMR processing failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[scan-omr] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
