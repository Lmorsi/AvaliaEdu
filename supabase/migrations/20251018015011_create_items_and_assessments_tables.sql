/*
  # Criação de Tabelas para Itens e Avaliações

  1. Novas Tabelas
    - `items` (itens de avaliação)
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário)
      - `autor` (text, autor do item)
      - `disciplina` (text, disciplina/matéria)
      - `etapa_ensino` (text, etapa de ensino)
      - `tipo_item` (text, tipo: multipla_escolha, verdadeiro_falso, discursiva)
      - `descritor` (text, descritor de habilidade)
      - `texto_item` (text, texto/enunciado da questão)
      - `justificativas` (text, justificativa pedagógica)
      - `alternativas` (jsonb, array de alternativas para múltipla escolha)
      - `resposta_correta` (text, resposta correta)
      - `justificativa` (text, justificativa da resposta)
      - `nivel` (text, nível de dificuldade)
      - `quantidade_linhas` (text, quantidade de linhas para discursivas)
      - `afirmativas` (jsonb, array de afirmativas para verdadeiro/falso)
      - `afirmativas_extras` (jsonb, array de afirmativas extras)
      - `gabarito_afirmativas` (jsonb, gabarito das afirmativas principais)
      - `gabarito_afirmativas_extras` (jsonb, gabarito das afirmativas extras)
      - `data_criacao` (timestamptz, data de criação)
      - `created_at` (timestamptz)
    
    - `assessments` (avaliações)
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário)
      - `nome_avaliacao` (text, nome personalizado da avaliação)
      - `professor` (text, nome do professor)
      - `turma` (text, turma)
      - `data` (text, data da avaliação)
      - `instrucoes` (text, instruções)
      - `header_image_url` (text, URL da imagem do cabeçalho)
      - `use_image_as_header` (boolean, usar imagem como cabeçalho)
      - `image_width` (integer, largura da imagem)
      - `image_height` (integer, altura da imagem)
      - `header_image_width` (integer, largura da imagem do cabeçalho)
      - `header_image_height` (integer, altura da imagem do cabeçalho)
      - `tipo_avaliacao` (text, tipo da avaliação)
      - `mostrar_tipo_avaliacao` (boolean, mostrar tipo)
      - `nome_escola` (text, nome da escola)
      - `componente_curricular` (text, componente curricular)
      - `colunas` (text, número de colunas no PDF)
      - `layout_paginas` (text, layout das páginas)
      - `selected_items` (jsonb, array de IDs dos itens selecionados com seus dados)
      - `data_criacao` (timestamptz, data de criação)
      - `created_at` (timestamptz)

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para garantir que usuários só acessem seus próprios dados
    - Acesso restrito a usuários autenticados

  3. Importantes Notas
    - Todos os campos de texto usam valores padrão vazios
    - Arrays JSON são armazenados como jsonb para melhor performance
    - Índices criados para otimizar consultas por user_id
*/

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

CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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

CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_disciplina ON items(disciplina);
CREATE INDEX IF NOT EXISTS idx_items_tipo_item ON items(tipo_item);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);