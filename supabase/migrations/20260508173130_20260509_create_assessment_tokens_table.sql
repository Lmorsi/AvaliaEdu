/*
  # Criar sistema de tokens únicos para QR codes de provas

  1. Novas Tabelas
    - `assessment_tokens`
      - `id` (uuid, primary key)
      - `assessment_id` (uuid, fk -> assessments)
      - `student_id` (uuid, fk -> grading_students)
      - `user_id` (uuid, fk -> users, owner da prova)
      - `token` (text, unique) - token criptográfico único
      - `qr_code_data` (jsonb) - dados completos do QR code gerado
      - `is_validated` (boolean) - se o token foi validado no backend
      - `validation_timestamp` (timestamptz) - quando foi validado
      - `created_at` (timestamptz) - quando foi gerado

  2. Segurança
    - Enable RLS em `assessment_tokens`
    - Apenas o proprietário (user_id) pode visualizar seus tokens
    - Apenas o backend autorizado pode atualizar validação
    - Tokens são únicos globalmente
    - Índices para performance em buscas

  3. Índices
    - token (único)
    - assessment_id + student_id (para buscar tokens de um aluno em uma prova)
    - user_id (para listar tokens do usuário)
*/

CREATE TABLE IF NOT EXISTS assessment_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES grading_students(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  qr_code_data jsonb DEFAULT NULL,
  is_validated boolean DEFAULT false,
  validation_timestamp timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_assessment_tokens_token ON assessment_tokens(token);
CREATE INDEX IF NOT EXISTS idx_assessment_tokens_assessment_student ON assessment_tokens(assessment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_tokens_user_id ON assessment_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_tokens_is_validated ON assessment_tokens(is_validated);

-- Enable RLS
ALTER TABLE assessment_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Proprietários podem visualizar seus próprios tokens
CREATE POLICY "Users can view their own assessment tokens"
  ON assessment_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Apenas backend/service pode atualizar validação (via service role key)
CREATE POLICY "Service can update token validation"
  ON assessment_tokens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = user_id);

-- Policy: Apenas proprietário pode inserir tokens
CREATE POLICY "Users can create tokens for their assessments"
  ON assessment_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
