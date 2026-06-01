import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

interface TokenValidationRequest {
  token: string;
  action?: "validate" | "check";
}

interface TokenValidationResponse {
  valid: boolean;
  token_id?: string;
  assessment_id?: string;
  student_id?: string;
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

    // Buscar token no banco de dados
    const { data: tokenData, error: tokenError } = await supabase
      .from("assessment_tokens")
      .select("*")
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

    // Buscar dados do aluno
    const { data: studentData } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .eq("id", tokenData.student_id)
      .maybeSingle();

    // Buscar dados da avaliação
    const { data: assessmentData } = await supabase
      .from("assessments")
      .select("id, title, class_id")
      .eq("id", tokenData.assessment_id)
      .maybeSingle();

    // Buscar dados da turma
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name")
      .eq("id", assessmentData?.class_id)
      .maybeSingle();

    // Se ação é "validate", marcar como validado
    if (action === "validate") {
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
          is_validated: true,
          message: "Token validado com sucesso",
          data: {
            student_id: studentData?.id,
            student_name: studentData?.full_name || "Aluno",
            assessment_id: assessmentData?.id,
            assessment_name: assessmentData?.title || "Avaliação",
            class_name: classData?.name || "Turma",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Se ação é "check", apenas verificar
    return new Response(
      JSON.stringify({
        valid: true,
        token_id: tokenData.id,
        assessment_id: tokenData.assessment_id,
        student_id: tokenData.student_id,
        is_validated: tokenData.is_validated,
        message: "Token encontrado",
        data: {
          student_id: studentData?.id,
          student_name: studentData?.full_name || "Aluno",
          assessment_id: assessmentData?.id,
          assessment_name: assessmentData?.title || "Avaliação",
          class_name: classData?.name || "Turma",
        },
      }),
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
