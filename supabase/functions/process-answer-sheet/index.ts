/*
  # Process Answer Sheet Edge Function

  This edge function receives an image of an answer sheet and sends it to the backend
  (main.py) for OMR processing. The backend processes the image using ArUco markers,
  oval bubbles detection, and filters, then returns the detected answers.

  Request format:
  - Method: POST
  - Body: { image: base64_string }
  - Returns: { success: bool, answers: Record<string, string>, debug?: string }
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessRequest {
  image: string;
  studentId?: string;
  assessmentId?: string;
}

interface ProcessResponse {
  success: boolean;
  answers?: Record<string, string>;
  qrData?: {
    token?: string;
    format?: string;
  };
  error?: string;
  debug?: {
    processedAt: string;
    imageSizeKb: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { image, studentId, assessmentId } = (await req.json()) as ProcessRequest;

    if (!image) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Image is required",
        } as ProcessResponse),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const backendUrl = Deno.env.get("BACKEND_API_URL") || "http://localhost:8000";

    // Send image to backend for processing
    const backendResponse = await fetch(`${backendUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image,
        studentId,
        assessmentId,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("Backend error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Backend error: ${backendResponse.statusText}`,
        } as ProcessResponse),
        {
          status: backendResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result = await backendResponse.json();

    const response: ProcessResponse = {
      success: result.success || false,
      answers: result.answers || {},
      qrData: result.qr_data,
      debug: {
        processedAt: new Date().toISOString(),
        imageSizeKb: Math.round(image.length / 1024),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } as ProcessResponse),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
