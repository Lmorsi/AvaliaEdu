import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Apenas POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON body
    const body = await req.json();
    const { photo, filename, debug } = body;

    if (!photo) {
      return new Response(
        JSON.stringify({ error: "Missing photo data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
    formData.append("debug", debug || "false");

    // Determina URL do OMR Service
    const omrServiceUrls = [
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      Deno.env.get("OMR_SERVICE_URL"),
    ].filter(Boolean);

    const omrUrl = omrServiceUrls[0];

    if (!omrUrl) {
      return new Response(
        JSON.stringify({ error: "OMR Service URL not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[OMR] Enviando para: ${omrUrl}/api/omr/scan`);

    // Faz proxy para o OMR Service
    const response = await fetch(`${omrUrl}/api/omr/scan`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[OMR] Erro:", data);
      return new Response(JSON.stringify({ error: data.error || "OMR processing failed" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[OMR] Sucesso");

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[OMR] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

