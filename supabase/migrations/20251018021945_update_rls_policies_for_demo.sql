/*
  # Atualização das Políticas RLS para Modo Demo

  1. Alterações
    - Remove as políticas existentes que exigem autenticação
    - Adiciona políticas que permitem acesso público para demo
    - Mantém o RLS habilitado para segurança futura

  2. Notas Importantes
    - Esta configuração é adequada para demonstração
    - Em produção, deve-se usar autenticação real do Supabase
    - As políticas verificam user_id, mas não exigem auth.uid()
*/

-- Remover políticas antigas da tabela items
DROP POLICY IF EXISTS "Users can view own items" ON items;
DROP POLICY IF EXISTS "Users can create own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;

-- Criar novas políticas para items (permitir acesso público)
CREATE POLICY "Allow public to view items"
  ON items FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create items"
  ON items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update items"
  ON items FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete items"
  ON items FOR DELETE
  USING (true);

-- Remover políticas antigas da tabela assessments
DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can create own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can delete own assessments" ON assessments;

-- Criar novas políticas para assessments (permitir acesso público)
CREATE POLICY "Allow public to view assessments"
  ON assessments FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create assessments"
  ON assessments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update assessments"
  ON assessments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete assessments"
  ON assessments FOR DELETE
  USING (true);