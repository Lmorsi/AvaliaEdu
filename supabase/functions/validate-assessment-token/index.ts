import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

interface TokenValidationRequest {
  token: string;
  action?: "validate" | "check" | "scan";
}

interface TokenValidationResponse {
  valid: boolean;
  token_id?: string;
  assessment_id?: string;
  student_id?: string;
  student_name?: string;
  assessment_name?: string;
  class_name?: string;
  class_id?: string;
  user_id?: string;
  is_validated?: boolean;
  message: string;
}

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL ou SERVICE_ROLE_KEY não configurados");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TokenValidationRequest = await req.json();
    const { token, action = "validate" } = body;

    if (!token) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Token é obrigatório",
        } as TokenValidationResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar token com joins para trazer dados completos do aluno/avaliação/turma
    // classes é obtida via grading_students (não há FK direta em assessment_tokens)
    const { data: tokenData, error: tokenError } = await supabase
      .from("assessment_tokens")
      .select(`
        *,
        grading_students(id, name, class_id, classes(id, name)),
        assessments(id, nome_avaliacao, tipo_avaliacao)
      `)
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("Erro ao buscar token:", tokenError);
      throw new Error(`Erro ao validar token: ${tokenError.message}`);
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Token não encontrado ou inválido",
        } as TokenValidationResponse),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const student = tokenData.grading_students as any;
    const assessment = tokenData.assessments as any;
    const classData = student?.classes as any;

    const studentName = student?.name || null;
    const assessmentName =
      assessment?.nome_avaliacao ||
      assessment?.tipo_avaliacao ||
      "Avaliação";
    const className = classData?.name || null;
    const classId = classData?.id || student?.class_id || null;

    // Ação "scan": marca como validado e retorna dados completos
    if (action === "validate" || action === "scan") {
      const { error: updateError } = await supabase
        .from("assessment_tokens")
        .update({
          is_validated: true,
          validation_timestamp: new Date().toISOString(),
        })
        .eq("token", token);

      if (updateError) {
        console.error("Erro ao atualizar validação:", updateError);
        throw new Error(
          `Erro ao marcar token como validado: ${updateError.message}`
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          token_id: tokenData.id,
          assessment_id: tokenData.assessment_id,
          student_id: tokenData.student_id,
          student_name: studentName,
          assessment_name: assessmentName,
          class_name: className,
          class_id: classId,
          user_id: tokenData.user_id,
          is_validated: true,
          message: "Token validado com sucesso",
        } as TokenValidationResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ação "check": apenas verificar sem marcar
    return new Response(
      JSON.stringify({
        valid: true,
        token_id: tokenData.id,
        assessment_id: tokenData.assessment_id,
        student_id: tokenData.student_id,
        student_name: studentName,
        assessment_name: assessmentName,
        class_name: className,
        class_id: classId,
        user_id: tokenData.user_id,
        is_validated: tokenData.is_validated,
        message: "Token encontrado",
      } as TokenValidationResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro na validação de token:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        message: `Erro interno: ${error instanceof Error ? error.message : "Desconhecido"}`,
      } as TokenValidationResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
