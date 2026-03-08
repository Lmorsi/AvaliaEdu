/*
  # Sistema Completo de Avaliações e Correção
  
  1. Novas Tabelas
    - `items` (itens/questões de avaliação)
      - Armazena todas as questões criadas pelo professor
      - Suporta múltipla escolha, verdadeiro/falso e discursivas
      - Campos para descritor, gabarito, justificativas
    
    - `assessments` (avaliações criadas)
      - Armazena avaliações montadas com itens selecionados
      - Configurações de layout, cabeçalho, instruções
      - Referência aos itens selecionados
    
    - `classes` (turmas)
      - Gerenciamento de turmas do professor
      - Nome da turma e ano letivo
    
    - `students` (estudantes)
      - Lista de estudantes por turma
      - Nome e matrícula (opcional)
    
    - `assessment_gradings` (correções de avaliações)
      - Registro de correção de uma avaliação para uma turma
      - Gabarito oficial e descritores de itens
    
    - `student_results` (resultados individuais)
      - Respostas e nota de cada estudante
      - Contagem de acertos e erros
    
    - `question_statistics` (estatísticas por questão)
      - Análise de cada questão da avaliação
      - Contagem de respostas por alternativa
      - Percentual de acertos
  
  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de acesso público para demonstração
    - Em produção, substituir por políticas com auth.uid()
*/

-- Tabela de Itens/Questões
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  autor text DEFAULT '',
  disciplina text DEFAULT '',
  etapa_ensino text DEFAULT '',
  tipo_item text DEFAULT '',
  descritor text DEFAULT '',
  texto_item text DEFAULT '',
  justificativas text DEFAULT '',
  alternativas jsonb DEFAULT '[]'::jsonb,
  resposta_correta text DEFAULT '',
  justificativa text DEFAULT '',
  nivel text DEFAULT '',
  quantidade_linhas text DEFAULT '5',
  afirmativas jsonb DEFAULT '[]'::jsonb,
  afirmativas_extras jsonb DEFAULT '[]'::jsonb,
  gabarito_afirmativas jsonb DEFAULT '[]'::jsonb,
  gabarito_afirmativas_extras jsonb DEFAULT '[]'::jsonb,
  data_criacao timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

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

-- Tabela de Avaliações
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome_avaliacao text DEFAULT '',
  professor text DEFAULT '',
  turma text DEFAULT '',
  data text DEFAULT '',
  instrucoes text DEFAULT '',
  header_image_url text DEFAULT '',
  use_image_as_header boolean DEFAULT true,
  image_width integer DEFAULT 190,
  image_height integer DEFAULT 40,
  header_image_width integer DEFAULT 190,
  header_image_height integer DEFAULT 60,
  tipo_avaliacao text DEFAULT '',
  mostrar_tipo_avaliacao boolean DEFAULT true,
  nome_escola text DEFAULT '',
  componente_curricular text DEFAULT '',
  colunas text DEFAULT '1',
  layout_paginas text DEFAULT 'pagina2',
  selected_items jsonb DEFAULT '[]'::jsonb,
  data_criacao timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

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

-- Tabela de Estudantes
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public to view students"
  ON students FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create students"
  ON students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update students"
  ON students FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete students"
  ON students FOR DELETE
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

-- Tabela de Resultados dos Estudantes
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

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_disciplina ON items(disciplina);
CREATE INDEX IF NOT EXISTS idx_items_tipo_item ON items(tipo_item);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

CREATE INDEX IF NOT EXISTS idx_assessment_gradings_user_id ON assessment_gradings(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_gradings_class_id ON assessment_gradings(class_id);

CREATE INDEX IF NOT EXISTS idx_student_results_grading_id ON student_results(grading_id);
CREATE INDEX IF NOT EXISTS idx_student_results_student_id ON student_results(student_id);

CREATE INDEX IF NOT EXISTS idx_question_statistics_grading_id ON question_statistics(grading_id);
