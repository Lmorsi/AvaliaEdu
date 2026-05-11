/*
  # Sistema de Correção de Avaliações e Estatísticas

  1. Novas Tabelas
    - `classes` (turmas)
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário)
      - `name` (text, nome da turma)
      - `school_year` (text, ano letivo)
      - `created_at` (timestamp)
    
    - `students` (estudantes)
      - `id` (uuid, chave primária)
      - `class_id` (uuid, referência à turma)
      - `name` (text, nome do estudante)
      - `registration_number` (text, matrícula - opcional)
      - `created_at` (timestamp)
    
    - `assessment_gradings` (correções de avaliações)
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário)
      - `class_id` (uuid, referência à turma)
      - `assessment_name` (text, nome da avaliação)
      - `total_questions` (integer, total de questões)
      - `answer_key` (jsonb, gabarito oficial - array de respostas corretas)
      - `grading_date` (timestamp, data da correção)
      - `created_at` (timestamp)
    
    - `student_results` (resultados dos estudantes)
      - `id` (uuid, chave primária)
      - `grading_id` (uuid, referência à correção)
      - `student_id` (uuid, referência ao estudante)
      - `answers` (jsonb, respostas do estudante - array)
      - `score` (numeric, nota/percentual de acerto)
      - `correct_count` (integer, quantidade de acertos)
      - `incorrect_count` (integer, quantidade de erros)
      - `created_at` (timestamp)
    
    - `question_statistics` (estatísticas por questão)
      - `id` (uuid, chave primária)
      - `grading_id` (uuid, referência à correção)
      - `question_number` (integer, número da questão)
      - `correct_answer` (text, resposta correta)
      - `option_a_count` (integer, quantidade de marcações na opção A)
      - `option_b_count` (integer, quantidade de marcações na opção B)
      - `option_c_count` (integer, quantidade de marcações na opção C)
      - `option_d_count` (integer, quantidade de marcações na opção D)
      - `option_e_count` (integer, quantidade de marcações na opção E)
      - `blank_count` (integer, quantidade de questões em branco)
      - `total_correct` (integer, total de acertos)
      - `total_incorrect` (integer, total de erros)
      - `created_at` (timestamp)

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para garantir que usuários só acessem seus próprios dados
*/

-- Criar tabela de turmas
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

-- Criar tabela de estudantes
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view students in their classes"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create students in their classes"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update students in their classes"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete students in their classes"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Criar tabela de correções de avaliações
CREATE TABLE IF NOT EXISTS assessment_gradings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  assessment_name text NOT NULL,
  total_questions integer NOT NULL,
  answer_key jsonb NOT NULL,
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

-- Criar tabela de resultados dos estudantes
CREATE TABLE IF NOT EXISTS student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_id uuid NOT NULL REFERENCES assessment_gradings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  score numeric DEFAULT 0,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results in their gradings"
  ON student_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = student_results.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create results in their gradings"
  ON student_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = student_results.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update results in their gradings"
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

CREATE POLICY "Users can delete results in their gradings"
  ON student_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = student_results.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

-- Criar tabela de estatísticas por questão
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

CREATE POLICY "Users can view statistics in their gradings"
  ON question_statistics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = question_statistics.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create statistics in their gradings"
  ON question_statistics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = question_statistics.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update statistics in their gradings"
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

CREATE POLICY "Users can delete statistics in their gradings"
  ON question_statistics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_gradings
      WHERE assessment_gradings.id = question_statistics.grading_id
      AND assessment_gradings.user_id = auth.uid()
    )
  );

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_assessment_gradings_user_id ON assessment_gradings(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_gradings_class_id ON assessment_gradings(class_id);
CREATE INDEX IF NOT EXISTS idx_student_results_grading_id ON student_results(grading_id);
CREATE INDEX IF NOT EXISTS idx_student_results_student_id ON student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_question_statistics_grading_id ON question_statistics(grading_id);
