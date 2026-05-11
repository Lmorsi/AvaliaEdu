/*
  # Criar tabela user_profiles

  1. Nova Tabela
    - `user_profiles`
      - `id` (uuid, primary key) - Referência a auth.users
      - `email` (text) - Email do usuário
      - `name` (text) - Nome completo do usuário
      - `role` (text) - Função do usuário: 'user' ou 'admin'
      - `created_at` (timestamptz) - Data de criação

  2. Segurança
    - Habilitar RLS na tabela
    - Usuários podem ver seu próprio perfil
    - Admins podem ver todos os perfis
    - Usuários podem atualizar seu próprio perfil (exceto role)
    - Usuários podem inserir seu próprio perfil com role 'user'
*/

-- Criar tabela user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'user');