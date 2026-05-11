/*
  # Corrigir email do administrador e função de trigger

  1. Alterações
    - Atualizar a função de trigger para usar o email correto: lucasmorsi@gmail.com (com "s")
    - Garantir que o usuário existente tenha role de admin
  
  2. Segurança
    - Mantém as políticas RLS existentes
    - Apenas atualiza a lógica de auto-promoção a admin
*/

-- Remover a função antiga se existir
DROP FUNCTION IF EXISTS auto_assign_admin_role() CASCADE;

-- Criar a função corrigida com o email correto
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o email for lucasmorsi@gmail.com, definir role como admin
  IF NEW.email = 'lucasmorsi@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger para novos registros e atualizações
DROP TRIGGER IF EXISTS set_admin_role_on_insert ON user_profiles;
CREATE TRIGGER set_admin_role_on_insert
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_admin_role();

-- Garantir que o usuário existente tenha role de admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'lucasmorsi@gmail.com' 
AND role != 'admin';