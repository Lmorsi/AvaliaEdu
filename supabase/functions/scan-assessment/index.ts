import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QRCodeData {
  assessment_id: string;
  class_id: string;
  grading_id: string;
  answer_key: string[];
  item_types: string[];
  item_descriptors: string[];
  item_alternatives: string[][];
  item_groups: number[][];
  total_questions: number;
}

interface VisionTextAnnotation {
  description: string;
  boundingPoly?: {
    vertices: Array<{ x: number; y: number }>;
  };
}

interface VisionResponse {
  responses: Array<{
    textAnnotations?: VisionTextAnnotation[];
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      message: string;
    };
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const visionApiKey = Deno.env.get("GOOGLE_VISION_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!visionApiKey) {
      console.error("Google Vision API key not configured");
      return new Response(
        JSON.stringify({ error: "Google Vision API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parseError instanceof Error ? parseError.message : "Unknown error"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { image, studentName } = body;

    if (!image) {
      console.error("No image provided in request");
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing image, size:", image.length);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    console.log("Calling Vision API...");
    const visionResponse = await analyzeImageWithVision(base64Data, visionApiKey);
    console.log("Vision API response received");

    console.log("Extracting QR Code data...");
    const qrData = await extractQRCodeData(visionResponse);

    if (!qrData) {
      console.error("QR Code not found in image");
      return new Response(
        JSON.stringify({
          error: "QR Code not found in image",
          suggestion: "Make sure the QR code is visible and not damaged"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("QR Code data extracted:", {
      assessment_id: qrData.assessment_id,
      class_id: qrData.class_id,
      grading_id: qrData.grading_id
    });

    let detectedStudentName = studentName;
    if (!detectedStudentName) {
      detectedStudentName = extractStudentNameFromVision(visionResponse);
    }

    if (!detectedStudentName) {
      return new Response(
        JSON.stringify({ error: "Student name is required and could not be detected" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const studentAnswers = extractAnswersFromVision(visionResponse, qrData.total_questions);

    const normalizedStudentName = detectedStudentName.trim();

    let { data: student, error: studentError } = await supabase
      .from("grading_students")
      .select("id")
      .eq("class_id", qrData.class_id)
      .eq("name", normalizedStudentName)
      .maybeSingle();

    if (!student && !studentError) {
      const { data: newStudent, error: createError } = await supabase
        .from("grading_students")
        .insert({
          class_id: qrData.class_id,
          name: normalizedStudentName,
        })
        .select("id")
        .maybeSingle();

      if (createError) {
        if (createError.code === '23505') {
          const { data: existingStudent } = await supabase
            .from("grading_students")
            .select("id")
            .eq("class_id", qrData.class_id)
            .eq("name", normalizedStudentName)
            .maybeSingle();

          if (existingStudent) {
            student = existingStudent;
          }
        }

        if (!student) {
          return new Response(
            JSON.stringify({
              error: "Failed to create student",
              details: createError.message,
              studentName: normalizedStudentName,
              classId: qrData.class_id
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else {
        student = newStudent;
      }
    }

    if (studentError || !student) {
      return new Response(
        JSON.stringify({
          error: "Student lookup failed",
          details: studentError?.message,
          studentName: normalizedStudentName,
          classId: qrData.class_id
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const score = calculateScore(studentAnswers, qrData.answer_key, qrData.item_types);

    const { error: insertError } = await supabase
      .from("student_results")
      .insert({
        grading_id: qrData.grading_id,
        student_id: student.id,
        answers: studentAnswers,
        score: score.score,
        correct_count: score.correctCount,
        incorrect_count: score.incorrectCount,
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to save results", details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        studentId: student.id,
        studentName: normalizedStudentName,
        score: score.score,
        correctCount: score.correctCount,
        incorrectCount: score.incorrectCount,
        answers: studentAnswers,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing assessment scan:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function analyzeImageWithVision(base64Image: string, apiKey: string): Promise<VisionResponse> {
  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestBody = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          { type: "TEXT_DETECTION", maxResults: 50 },
          { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }
        ],
      },
    ],
  };

  try {
    const response = await fetch(visionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vision API error:", response.status, errorText);
      throw new Error(`Vision API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.responses && result.responses[0]?.error) {
      console.error("Vision API returned error:", result.responses[0].error);
      throw new Error(`Vision API error: ${result.responses[0].error.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error calling Vision API:", error);
    throw error;
  }
}

async function extractQRCodeData(visionResponse: VisionResponse): Promise<QRCodeData | null> {
  const textAnnotations = visionResponse.responses[0]?.textAnnotations;

  if (!textAnnotations || textAnnotations.length === 0) {
    return null;
  }

  for (const annotation of textAnnotations) {
    try {
      const text = annotation.description.trim();
      if (text.startsWith('{') && text.includes('assessment_id')) {
        const qrData = JSON.parse(text);
        return qrData as QRCodeData;
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

function extractStudentNameFromVision(visionResponse: VisionResponse): string {
  const fullText = visionResponse.responses[0]?.fullTextAnnotation?.text || "";

  const namePatterns = [
    /Nome:\s*([A-Za-zÀ-ÿ\s]+)/i,
    /Aluno:\s*([A-Za-zÀ-ÿ\s]+)/i,
    /Estudante:\s*([A-Za-zÀ-ÿ\s]+)/i,
    /Name:\s*([A-Za-zÀ-ÿ\s]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const lines = fullText.split('\n').filter(line => line.trim().length > 0);
  for (const line of lines.slice(0, 5)) {
    if (line.length > 3 && line.length < 50 && /^[A-Za-zÀ-ÿ\s]+$/.test(line)) {
      return line.trim();
    }
  }

  return "";
}

function extractAnswersFromVision(visionResponse: VisionResponse, totalQuestions: number): string[] {
  const textAnnotations = visionResponse.responses[0]?.textAnnotations;
  const answers: string[] = [];

  if (!textAnnotations) {
    return Array(totalQuestions).fill('');
  }

  const fullText = visionResponse.responses[0]?.fullTextAnnotation?.text || "";
  const lines = fullText.split('\n');

  const questionPattern = /(\d+)\s*[.:-]?\s*([A-Ea-e])/;

  for (let i = 1; i <= totalQuestions; i++) {
    let found = false;

    for (const line of lines) {
      const match = line.match(questionPattern);
      if (match && parseInt(match[1]) === i) {
        answers.push(match[2].toUpperCase());
        found = true;
        break;
      }
    }

    if (!found) {
      for (const annotation of textAnnotations) {
        const text = annotation.description.trim();
        if (text.length === 1 && /[A-Ea-e]/.test(text)) {
          const checkPattern = new RegExp(`${i}\\s*[.:-]?\\s*${text}`, 'i');
          if (fullText.match(checkPattern)) {
            answers.push(text.toUpperCase());
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      answers.push('');
    }
  }

  return answers;
}

function calculateScore(
  answers: string[],
  answerKey: string[],
  itemTypes: string[]
): { score: number; correctCount: number; incorrectCount: number } {
  let correctCount = 0;
  let incorrectCount = 0;

  answers.forEach((answer, index) => {
    if (answer && answer.toUpperCase() === answerKey[index]?.toUpperCase()) {
      correctCount++;
    } else if (answer) {
      incorrectCount++;
    }
  });

  const score = answerKey.length > 0 ? (correctCount / answerKey.length) * 100 : 0;

  return { score, correctCount, incorrectCount };
}
