import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

interface TokenValidationRequest {
  token: string;
  action?: "validate" | "check";
  // Quando action="validate", pode enviar respostas para salvar junto
  answers?: Record<string, string>;
  student_id?: string;
  assessment_id?: string;
}

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL ou SERVICE_ROLE_KEY não configurados");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: TokenValidationRequest = await req.json();
    const { token, action = "check", answers } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, message: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar token + dados do aluno + avaliação em uma query
    const { data: tokenData, error: tokenError } = await supabase
      .from("assessment_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) throw new Error(`Erro ao validar token: ${tokenError.message}`);

    if (!tokenData) {
      return new Response(
        JSON.stringify({ valid: false, message: "Token não encontrado ou inválido" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados complementares em paralelo
    const [studentRes, assessmentRes] = await Promise.all([
      supabase.from("user_profiles").select("id, full_name").eq("id", tokenData.student_id).maybeSingle(),
      supabase.from("assessments").select("id, title, class_id").eq("id", tokenData.assessment_id).maybeSingle(),
    ]);

    const studentData = studentRes.data;
    const assessmentData = assessmentRes.data;

    let classData = null;
    if (assessmentData?.class_id) {
      const classRes = await supabase
        .from("classes")
        .select("id, name")
        .eq("id", assessmentData.class_id)
        .maybeSingle();
      classData = classRes.data;
    }

    const responseData = {
      student_id: studentData?.id || tokenData.student_id,
      student_name: studentData?.full_name || "Aluno",
      assessment_id: assessmentData?.id || tokenData.assessment_id,
      assessment_name: assessmentData?.title || "Avaliação",
      class_name: classData?.name || "",
    };

    // ── Action: check — apenas verificar ────────────────────────────────────
    if (action === "check") {
      return new Response(
        JSON.stringify({
          valid: true,
          token_id: tokenData.id,
          assessment_id: tokenData.assessment_id,
          student_id: tokenData.student_id,
          is_validated: tokenData.is_validated,
          message: "Token encontrado",
          data: responseData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: validate — marcar como validado + salvar respostas ───────────
    // 1. Marcar token como validado
    const { error: updateError } = await supabase
      .from("assessment_tokens")
      .update({ is_validated: true, validation_timestamp: new Date().toISOString() })
      .eq("token", token);

    if (updateError) throw new Error(`Erro ao validar token: ${updateError.message}`);

    // 2. Salvar respostas se fornecidas
    let saved = false;
    if (answers && Object.keys(answers).length > 0) {
      const studentId = tokenData.student_id;
      const assessmentId = tokenData.assessment_id;

      const { error: upsertError } = await supabase
        .from("student_results")
        .upsert(
          [{
            student_id: studentId,
            assessment_id: assessmentId,
            answers,
            created_at: new Date().toISOString(),
          }],
          { onConflict: "student_id,assessment_id" }
        );

      if (upsertError) {
        // Tenta insert simples se upsert falhar (constraint pode não existir)
        const { error: insertError } = await supabase
          .from("student_results")
          .insert([{
            student_id: studentId,
            assessment_id: assessmentId,
            answers,
            created_at: new Date().toISOString(),
          }]);
        if (insertError) {
          console.error("Erro ao salvar respostas:", insertError);
        } else {
          saved = true;
        }
      } else {
        saved = true;
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        saved,
        token_id: tokenData.id,
        assessment_id: tokenData.assessment_id,
        student_id: tokenData.student_id,
        is_validated: true,
        message: saved ? "Token validado e respostas salvas" : "Token validado com sucesso",
        data: responseData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na validação de token:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        message: `Erro interno: ${error instanceof Error ? error.message : "Desconhecido"}`,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
