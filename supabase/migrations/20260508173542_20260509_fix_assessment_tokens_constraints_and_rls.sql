/*
  # Corrigir tabela assessment_tokens

  1. Mudanças
    - Adiciona constraint UNIQUE em (assessment_id, student_id) para suportar upsert sem duplicatas
    - Corrige política de UPDATE: permite que o serviço autenticado atualize via service role
    - Substitui política de UPDATE anterior que era redundante

  2. Segurança
    - SELECT: apenas o proprietário (user_id = auth.uid())
    - INSERT: apenas o proprietário
    - UPDATE: apenas o proprietário — usado para marcar is_validated e validation_timestamp
    - DELETE: apenas o proprietário
*/

-- Adicionar constraint de unicidade para suportar upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assessment_tokens_assessment_student_unique'
  ) THEN
    ALTER TABLE assessment_tokens
    ADD CONSTRAINT assessment_tokens_assessment_student_unique
    UNIQUE (assessment_id, student_id);
  END IF;
END $$;

-- Remover política de UPDATE anterior (era incorreta)
DROP POLICY IF EXISTS "Service can update token validation" ON assessment_tokens;

-- Política de UPDATE correta: proprietário pode atualizar seus próprios tokens
CREATE POLICY "Users can update their own assessment tokens"
  ON assessment_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política de DELETE: proprietário pode deletar seus tokens
CREATE POLICY "Users can delete their own assessment tokens"
  ON assessment_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
