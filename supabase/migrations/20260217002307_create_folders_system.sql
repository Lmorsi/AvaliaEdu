/*
  # Sistema de pastas para organização

  1. Nova Tabela
    - `folders` - Pastas para organizar correções
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Referência ao usuário
      - `name` (text) - Nome da pasta
      - `parent_folder_id` (uuid) - Referência à pasta pai para subpastas
      - `color` (text) - Cor da pasta para identificação visual
      - `created_at` (timestamptz) - Data de criação

  2. Modificações
    - Adicionar coluna `folder_id` à tabela `assessment_gradings`

  3. Segurança
    - Habilitar RLS na tabela
    - Usuários podem gerenciar suas próprias pastas
*/

-- Criar tabela de pastas
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Políticas para folders
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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