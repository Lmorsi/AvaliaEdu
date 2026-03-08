import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";
import jsQR from "npm:jsqr@1.4.0";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { image, studentName } = await req.json();

    if (!image || !studentName) {
      return new Response(
        JSON.stringify({ error: "Image and student name are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const imageData = await decodeImage(imageBuffer);

    const qrCode = jsQR(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    if (!qrCode) {
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

    const qrData: QRCodeData = JSON.parse(qrCode.data);

    const studentAnswers = await extractAnswersFromImage(imageData, qrData.total_questions);

    const normalizedStudentName = studentName.trim();

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

async function decodeImage(buffer: Uint8Array): Promise<{ data: number[]; width: number; height: number }> {
  const blob = new Blob([buffer]);
  const imageBitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(imageBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    data: Array.from(imageData.data),
    width: canvas.width,
    height: canvas.height,
  };
}

async function extractAnswersFromImage(
  imageData: { data: number[]; width: number; height: number },
  totalQuestions: number
): Promise<string[]> {
  const answers: string[] = [];

  for (let i = 0; i < totalQuestions; i++) {
    const answer = detectMarkedAnswer(imageData, i);
    answers.push(answer);
  }

  return answers;
}

function detectMarkedAnswer(
  imageData: { data: number[]; width: number; height: number },
  questionIndex: number
): string {
  const rowHeight = Math.floor(imageData.height / 30);
  const y = 150 + (questionIndex * rowHeight);

  const options = ['A', 'B', 'C', 'D', 'E'];
  const optionWidth = Math.floor(imageData.width / 7);

  let darkestOption = 'A';
  let darkestValue = 255;

  for (let optIdx = 0; optIdx < options.length; optIdx++) {
    const x = 200 + (optIdx * optionWidth);
    const darkness = calculateRegionDarkness(imageData, x, y, 40, 40);

    if (darkness < darkestValue) {
      darkestValue = darkness;
      darkestOption = options[optIdx];
    }
  }

  return darkestValue < 180 ? darkestOption : '';
}

function calculateRegionDarkness(
  imageData: { data: number[]; width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number
): number {
  let totalBrightness = 0;
  let pixelCount = 0;

  for (let py = y; py < y + height && py < imageData.height; py++) {
    for (let px = x; px < x + width && px < imageData.width; px++) {
      const idx = (py * imageData.width + px) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }
  }

  return pixelCount > 0 ? totalBrightness / pixelCount : 255;
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
