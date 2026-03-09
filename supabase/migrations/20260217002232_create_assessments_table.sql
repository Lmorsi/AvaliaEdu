/*
  # Criar tabela assessments

  1. Nova Tabela
    - `assessments` - Armazena avaliações criadas pelos usuários
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Referência ao usuário
      - `nome_avaliacao` (text) - Nome da avaliação
      - `professor` (text) - Nome do professor
      - `turma` (text) - Turma
      - `data` (text) - Data da avaliação
      - `instrucoes` (text) - Instruções
      - `header_image_url` (text) - URL da imagem do cabeçalho
      - `use_image_as_header` (boolean) - Usar imagem como cabeçalho
      - `image_width` (integer) - Largura da imagem
      - `image_height` (integer) - Altura da imagem
      - `header_image_width` (integer) - Largura da imagem do cabeçalho
      - `header_image_height` (integer) - Altura da imagem do cabeçalho
      - `tipo_avaliacao` (text) - Tipo de avaliação
      - `mostrar_tipo_avaliacao` (boolean) - Mostrar tipo de avaliação
      - `nome_escola` (text) - Nome da escola
      - `componente_curricular` (text) - Componente curricular
      - `colunas` (text) - Número de colunas
      - `layout_paginas` (text) - Layout das páginas
      - `selected_items` (jsonb) - Itens selecionados para a avaliação
      - `data_criacao` (timestamptz) - Data de criação
      - `created_at` (timestamptz) - Timestamp de criação

  2. Segurança
    - Habilitar RLS na tabela
    - Usuários autenticados podem ver todas as avaliações
    - Usuários podem criar suas próprias avaliações
    - Usuários podem atualizar suas próprias avaliações
    - Usuários podem deletar suas próprias avaliações
*/

-- Criar tabela de avaliações
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

-- Habilitar RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Políticas para assessments
CREATE POLICY "Users can view all assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (true);

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