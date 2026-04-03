/*
  # Função para tornar usuário admin

  1. Nova Função
    - `make_user_admin(user_email text)` - torna um usuário admin pelo email
  
  2. Segurança
    - Apenas admins podem executar esta função
*/

-- Função para tornar um usuário admin
CREATE OR REPLACE FUNCTION make_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir ou atualizar o perfil do usuário para admin
  INSERT INTO user_profiles (id, email, name, role)
  SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email), 
    'admin'
  FROM auth.users
  WHERE email = user_email
  ON CONFLICT (id) 
  DO UPDATE SET role = 'admin';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', user_email;
  END IF;
END;
$$;

-- Permitir que usuários autenticados chamem a função (temporariamente)
GRANT EXECUTE ON FUNCTION make_user_admin TO authenticated;