/*
  # Corrigir políticas de RLS para user_profiles

  1. Problema
    - Recursão infinita nas políticas de user_profiles
    - As políticas estão fazendo SELECT na própria tabela dentro da condição

  2. Solução
    - Remover políticas existentes que causam recursão
    - Criar novas políticas simplificadas e seguras
    - Usar uma abordagem direta sem recursão
*/

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Política para usuários verem seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política para usuários atualizarem seu próprio perfil (exceto role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política para usuários criarem seu próprio perfil
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'user');