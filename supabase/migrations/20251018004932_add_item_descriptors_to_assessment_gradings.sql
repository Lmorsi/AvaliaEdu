/*
  # Adicionar descritores dos itens às correções de avaliações

  1. Modificações
    - `assessment_gradings`
      - Adicionar coluna `item_descriptors` (jsonb) - array com descritores dos itens da avaliação
      - Esse campo armazenará os descritores/matriz de referência de cada questão
  
  2. Notas
    - Campo opcional para compatibilidade com correções existentes
    - Array de strings onde cada índice corresponde ao índice da questão no answer_key
*/

-- Adicionar coluna de descritores dos itens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_gradings' AND column_name = 'item_descriptors'
  ) THEN
    ALTER TABLE assessment_gradings ADD COLUMN item_descriptors jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
