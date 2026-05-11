/*
  # Criar tabelas de correção e estatísticas caso não existam

  1. Novas Tabelas
    - `classes` - Turmas
    - `assessment_gradings` - Correções de avaliações
    - `student_results` - Resultados individuais de estudantes
    - `question_statistics` - Estatísticas por questão

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Adicionar políticas de acesso público temporário
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

CREATE POLICY "Allow public to view classes"
  ON classes FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create classes"
  ON classes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update classes"
  ON classes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete classes"
  ON classes FOR DELETE
  USING (true);

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

CREATE POLICY "Allow public to view gradings"
  ON assessment_gradings FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create gradings"
  ON assessment_gradings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update gradings"
  ON assessment_gradings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete gradings"
  ON assessment_gradings FOR DELETE
  USING (true);

-- Criar nova tabela de estudantes para o sistema de correção
-- (separada da tabela students existente que é usada para faltas)
CREATE TABLE IF NOT EXISTS grading_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grading_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public to view grading students"
  ON grading_students FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create grading students"
  ON grading_students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update grading students"
  ON grading_students FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete grading students"
  ON grading_students FOR DELETE
  USING (true);

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

CREATE POLICY "Allow public to view results"
  ON student_results FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create results"
  ON student_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update results"
  ON student_results FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete results"
  ON student_results FOR DELETE
  USING (true);

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

CREATE POLICY "Allow public to view statistics"
  ON question_statistics FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create statistics"
  ON question_statistics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update statistics"
  ON question_statistics FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete statistics"
  ON question_statistics FOR DELETE
  USING (true);