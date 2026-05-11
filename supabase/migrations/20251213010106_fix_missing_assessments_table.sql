/*
  # Criar tabela assessments caso não exista

  1. Tabela
    - `assessments` - Armazena avaliações criadas pelos usuários
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência ao usuário)
      - `nome_avaliacao` (text)
      - `professor` (text)
      - `turma` (text)
      - `data` (text)
      - `instrucoes` (text)
      - `header_image_url` (text)
      - `use_image_as_header` (boolean)
      - `image_width` (integer)
      - `image_height` (integer)
      - `header_image_width` (integer)
      - `header_image_height` (integer)
      - `tipo_avaliacao` (text)
      - `mostrar_tipo_avaliacao` (boolean)
      - `nome_escola` (text)
      - `componente_curricular` (text)
      - `colunas` (text)
      - `layout_paginas` (text)
      - `selected_items` (jsonb)
      - `data_criacao` (timestamptz)
      - `created_at` (timestamptz)

  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar políticas para permitir acesso público temporário (deve ser refinado depois)
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