/*
  # Criar tabela items

  1. Nova Tabela
    - `items` - Armazena questões/itens de avaliação criados pelos usuários
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Referência ao usuário
      - `autor` (text) - Autor do item
      - `disciplina` (text) - Disciplina do item
      - `etapa_ensino` (text) - Etapa de ensino
      - `tipo_item` (text) - multipla_escolha, verdadeiro_falso, discursiva
      - `descritor` (text) - Descritor do item
      - `texto_item` (text) - Texto da questão
      - `justificativas` (text) - Justificativas para correção
      - `alternativas` (jsonb) - Alternativas para múltipla escolha
      - `resposta_correta` (text) - Resposta correta
      - `justificativa` (text) - Justificativa adicional
      - `nivel` (text) - Nível de dificuldade
      - `quantidade_linhas` (text) - Linhas para questão discursiva
      - `afirmativas` (jsonb) - Afirmativas para V/F
      - `afirmativas_extras` (jsonb) - Afirmativas extras para V/F
      - `gabarito_afirmativas` (jsonb) - Gabaritos das afirmativas
      - `gabarito_afirmativas_extras` (jsonb) - Gabaritos das afirmativas extras
      - `data_criacao` (timestamptz) - Data de criação
      - `created_at` (timestamptz) - Timestamp de criação

  2. Segurança
    - Habilitar RLS na tabela
    - Usuários autenticados podem ver todos os itens
    - Usuários podem criar seus próprios itens
    - Usuários podem atualizar seus próprios itens
    - Usuários podem deletar seus próprios itens
*/

-- Criar tabela de itens/questões
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

-- Habilitar RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Políticas para items
CREATE POLICY "Users can view all items"
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