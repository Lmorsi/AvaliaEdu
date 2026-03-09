/*
  # Atualizar Políticas RLS para Acesso Seguro

  1. Objetivo
    - Itens (questões): Visíveis para todos os usuários autenticados, mas apenas o criador pode editar/deletar
    - Demais dados: Totalmente restritos ao usuário que os criou
    
  2. Mudanças de Segurança
    - Remove todas as políticas públicas inseguras (role = public)
    - Implementa controle de acesso baseado em autenticação
    - Garante que cada usuário só acesse seus próprios dados
    
  3. Tabelas Afetadas
    - items: SELECT público (autenticados), INSERT/UPDATE/DELETE restrito ao dono
    - assessments: Todas as operações restritas ao dono
    - classes: Todas as operações restritas ao dono
    - students: Todas as operações restritas ao dono (via classes)
    - folders: Todas as operações restritas ao dono
    - assessment_gradings: Todas as operações restritas ao dono
    - student_results: Todas as operações restritas ao dono (via gradings)
    - question_statistics: Todas as operações restritas ao dono (via gradings)
    
  4. Observações Importantes
    - Esta migração é segura e não afeta dados existentes
    - Apenas ajusta as permissões de acesso
    - Usuários não autenticados não terão mais acesso a nenhum dado
*/

-- =====================================================
-- ITEMS (Questões)
-- =====================================================
-- Remove políticas públicas inseguras
DROP POLICY IF EXISTS "Allow public to view items" ON items;
DROP POLICY IF EXISTS "Allow public to create items" ON items;
DROP POLICY IF EXISTS "Allow public to update items" ON items;
DROP POLICY IF EXISTS "Allow public to delete items" ON items;

-- Cria políticas seguras
CREATE POLICY "Authenticated users can view all items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- ASSESSMENTS (Avaliações)
-- =====================================================
DROP POLICY IF EXISTS "Allow public to view assessments" ON assessments;
DROP POLICY IF EXISTS "Allow public to create assessments" ON assessments;
DROP POLICY IF EXISTS "Allow public to update assessments" ON assessments;
DROP POLICY IF EXISTS "Allow public to delete assessments" ON assessments;

CREATE POLICY "Users can view own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- CLASSES (Turmas)
-- =====================================================
DROP POLICY IF EXISTS "Allow public to view classes" ON classes;
DROP POLICY IF EXISTS "Allow public to create classes" ON classes;
DROP POLICY IF EXISTS "Allow public to update classes" ON classes;
DROP POLICY IF EXISTS "Allow public to delete classes" ON classes;

-- As políticas autenticadas já existem, não precisa recriar

-- =====================================================
-- FOLDERS (Pastas)
-- =====================================================
DROP POLICY IF EXISTS "Allow public to view folders" ON folders;
DROP POLICY IF EXISTS "Allow public to create folders" ON folders;
DROP POLICY IF EXISTS "Allow public to update folders" ON folders;
DROP POLICY IF EXISTS "Allow public to delete folders" ON folders;

CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- STUDENTS (Alunos)
-- =====================================================
DROP POLICY IF EXISTS "Allow public to view students" ON students;
DROP POLICY IF EXISTS "Allow public to create students" ON students;
DROP POLICY IF EXISTS "Allow public to update students" ON students;
DROP POLICY IF EXISTS "Allow public to delete students" ON students;

-- As políticas autenticadas já existem (via classes), não precisa recriar

-- =====================================================
-- ASSESSMENT_GRADINGS (Correções)
-- =====================================================
DROP POLICY IF EXISTS "Allow public to view gradings" ON assessment_gradings;
DROP POLICY IF EXISTS "Allow public to create gradings" ON assessment_gradings;
DROP POLICY IF EXISTS "Allow public to update gradings" ON assessment_gradings;
DROP POLICY IF EXISTS "Allow public to delete gradings" ON assessment_gradings;

-- As políticas autenticadas já existem, não precisa recriar

-- =====================================================
-- STUDENT_RESULTS (Resultados dos Alunos)
-- =====================================================
DROP POLICY IF EXISTS "Allow public to view results" ON student_results;
DROP POLICY IF EXISTS "Allow public to create results" ON student_results;
DROP POLICY IF EXISTS "Allow public to update results" ON student_results;
DROP POLICY IF EXISTS "Allow public to delete results" ON student_results;

-- As políticas autenticadas já existem (via gradings), não precisa recriar

-- =====================================================
-- QUESTION_STATISTICS (Estatísticas)
-- =====================================================
DROP POLICY IF EXISTS "Allow public to view statistics" ON question_statistics;
DROP POLICY IF EXISTS "Allow public to create statistics" ON question_statistics;
DROP POLICY IF EXISTS "Allow public to update statistics" ON question_statistics;
DROP POLICY IF EXISTS "Allow public to delete statistics" ON question_statistics;

-- As políticas autenticadas já existem (via gradings), não precisa recriar

-- =====================================================
-- USER_FEEDBACK (Feedback dos Usuários)
-- =====================================================
DROP POLICY IF EXISTS "Allow anyone to create feedback" ON user_feedback;

-- As políticas autenticadas já existem, não precisa recriar
