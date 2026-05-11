/*
  # Criar tabela de feedback

  1. Nova Tabela
    - `user_feedback` - Mensagens de feedback dos usuários
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Referência ao usuário
      - `user_name` (text) - Nome do usuário
      - `user_email` (text) - Email do usuário
      - `message` (text) - Mensagem de feedback
      - `is_read` (boolean) - Se foi lida pelo admin
      - `created_at` (timestamptz) - Data de criação

  2. Segurança
    - Habilitar RLS na tabela
    - Qualquer usuário pode enviar feedback
    - Usuários podem ver apenas seu próprio feedback
*/

-- Criar tabela de feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas para user_feedback
CREATE POLICY "Anyone can create feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_is_read ON user_feedback(is_read);