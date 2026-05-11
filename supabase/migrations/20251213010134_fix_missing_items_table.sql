/*
  # Criar tabela items caso não exista

  1. Tabela
    - `items` - Armazena questões/itens de avaliação criados pelos usuários
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência ao usuário)
      - `autor` (text)
      - `disciplina` (text)
      - `etapa_ensino` (text)
      - `tipo_item` (text) - multipla_escolha, verdadeiro_falso, discursiva
      - `descritor` (text)
      - `texto_item` (text)
      - `justificativas` (text)
      - `alternativas` (jsonb)
      - `resposta_correta` (text)
      - `justificativa` (text)
      - `nivel` (text)
      - `quantidade_linhas` (text)
      - `afirmativas` (jsonb)
      - `afirmativas_extras` (jsonb)
      - `gabarito_afirmativas` (jsonb)
      - `gabarito_afirmativas_extras` (jsonb)
      - `data_criacao` (timestamptz)
      - `created_at` (timestamptz)

  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar políticas para permitir acesso público temporário (deve ser refinado depois)
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