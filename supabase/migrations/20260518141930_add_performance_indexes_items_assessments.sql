/*
  # Índices de performance para items e assessments

  Adiciona índices nas colunas mais consultadas para eliminar full table scans.

  1. Tabela `items`
     - `user_id` — todas as queries filtram por dono
     - `created_at DESC` — todas as queries ordenam por data
     - `disciplina` — filtro de busca por disciplina
     - `tipo_item` — filtro de busca por tipo

  2. Tabela `assessments`
     - `user_id` — todas as queries filtram por dono
     - `created_at DESC` — todas as queries ordenam por data
     - `tipo_avaliacao` — filtro de busca por tipo

  3. Tabela `assessment_gradings`
     - `user_id` — queries de correção filtram por dono
     - `created_at DESC` — ordenação por data

  4. Tabela `classes`
     - `user_id` — queries de turmas filtram por dono
*/

CREATE INDEX IF NOT EXISTS idx_items_user_id
  ON public.items (user_id);

CREATE INDEX IF NOT EXISTS idx_items_created_at
  ON public.items (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_user_created
  ON public.items (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_disciplina
  ON public.items (disciplina);

CREATE INDEX IF NOT EXISTS idx_items_tipo_item
  ON public.items (tipo_item);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id
  ON public.assessments (user_id);

CREATE INDEX IF NOT EXISTS idx_assessments_created_at
  ON public.assessments (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_user_created
  ON public.assessments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_tipo_avaliacao
  ON public.assessments (tipo_avaliacao);

CREATE INDEX IF NOT EXISTS idx_assessment_gradings_user_id
  ON public.assessment_gradings (user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_gradings_created_at
  ON public.assessment_gradings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_classes_user_id
  ON public.classes (user_id);
