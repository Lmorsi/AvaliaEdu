/*
  # Tabela de Feedback/Contato dos Usuários

  1. Nova Tabela
    - `user_feedback` (mensagens enviadas pelos usuários)
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário que enviou)
      - `user_name` (text, nome do usuário)
      - `user_email` (text, email do usuário)
      - `message` (text, mensagem enviada)
      - `is_read` (boolean, se foi lida pelo admin)
      - `created_at` (timestamptz, data de criação)

  2. Segurança
    - RLS habilitado na tabela user_feedback
    - Políticas de acesso público para inserção
    - Políticas restritas para leitura (apenas usuários autenticados podem ver suas próprias mensagens)
*/

-- Tabela de Feedback dos Usuários
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário pode enviar feedback
CREATE POLICY "Allow anyone to create feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (true);

-- Usuários podem ver apenas seu próprio feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_is_read ON user_feedback(is_read);