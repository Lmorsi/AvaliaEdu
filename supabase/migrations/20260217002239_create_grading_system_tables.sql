/*
  # Criar tabelas do sistema de correção

  1. Novas Tabelas
    - `classes` - Turmas
    - `grading_students` - Estudantes para correção
    - `assessment_gradings` - Correções de avaliações
    - `student_results` - Resultados dos estudantes
    - `question_statistics` - Estatísticas por questão

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Usuários autenticados podem acessar seus próprios dados
*/

-- Tabela de Turmas
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  school_year text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own classes"
  ON classes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own classes"
  ON classes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tabela de Estudantes (para correção)
CREATE TABLE IF NOT EXISTS grading_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grading_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view students in own classes"
  ON grading_students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grading_students.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create students in own classes"
  ON grading_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update students in own classes"
  ON grading_students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grading_students.class_id
      AND classes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grading_students.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete students in own classes"
  ON grading_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grading_students.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Tabela de Correções de Avaliações
CREATE TABLE IF NOT EXISTS assessment_gradings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  assessment_name text NOT NULL,
  total_questions integer NOT NULL,
  answer_key jsonb NOT NULL,
  item_descriptors jsonb DEFAULT '[]'::jsonb,
  item_types jsonb DEFAULT '[]'::jsonb,
  item_groups jsonb DEFAULT '[]'::jsonb,
  item_alternatives jsonb DEFAULT '[]'::jsonb,
  grading_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_gradings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gradings"
  ON assessment_gradings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own gradings"
  ON assessment_gradings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gradings"
  ON assessment_gradings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gradings"
  ON assessment_gradings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tabela de Resultados dos Estudantes
CREATE TABLE IF NOT EXISTS student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_id uuid NOT NULL REFERENCES assessment_gradings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES grading_students(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  score numeric DEFAULT 0,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results in own gradings"
  ON student_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = student_results.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create results in own gradings"
  ON student_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update results in own gradings"
  ON student_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = student_results.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = student_results.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete results in own gradings"
  ON student_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = student_results.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

-- Tabela de Estatísticas por Questão
CREATE TABLE IF NOT EXISTS question_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_id uuid NOT NULL REFERENCES assessment_gradings(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  correct_answer text NOT NULL,
  option_a_count integer DEFAULT 0,
  option_b_count integer DEFAULT 0,
  option_c_count integer DEFAULT 0,
  option_d_count integer DEFAULT 0,
  option_e_count integer DEFAULT 0,
  blank_count integer DEFAULT 0,
  total_correct integer DEFAULT 0,
  total_incorrect integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE question_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view statistics in own gradings"
  ON question_statistics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = question_statistics.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create statistics in own gradings"
  ON question_statistics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update statistics in own gradings"
  ON question_statistics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = question_statistics.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = question_statistics.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete statistics in own gradings"
  ON question_statistics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = question_statistics.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );