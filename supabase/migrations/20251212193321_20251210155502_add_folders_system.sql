/*
  # Sistema de Pastas para Organização de Avaliações

  1. Nova Tabela
    - `folders` (pastas para organizar correções)
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário)
      - `name` (text, nome da pasta)
      - `parent_folder_id` (uuid, referência à pasta pai para subpastas)
      - `color` (text, cor da pasta para identificação visual)
      - `created_at` (timestamptz, data de criação)

  2. Modificações na Tabela Existente
    - Adicionar coluna `folder_id` à tabela `assessment_gradings`
      - Permite associar correções a pastas específicas
      - NULL permitido para correções sem pasta

  3. Segurança
    - RLS habilitado na tabela folders
    - Políticas de acesso público para demonstração
*/

-- Tabela de Pastas
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public to view folders"
  ON folders FOR SELECT
  USING (true);

CREATE POLICY "Allow public to create folders"
  ON folders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update folders"
  ON folders FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete folders"
  ON folders FOR DELETE
  USING (true);

-- Adicionar coluna folder_id à tabela assessment_gradings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_gradings' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE assessment_gradings ADD COLUMN folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_assessment_gradings_folder_id ON assessment_gradings(folder_id);
