/*
  # Adicionar coluna item_alternatives

  1. Mudanças
    - Adiciona coluna `item_alternatives` à tabela `assessment_gradings`
    - A coluna armazena as alternativas disponíveis para cada questão
    - Tipo JSONB para flexibilidade com arrays de strings
  
  2. Notas
    - Coluna opcional com valor padrão de array vazio
    - Necessária para armazenar as opções de resposta de cada item
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_gradings' AND column_name = 'item_alternatives'
  ) THEN
    ALTER TABLE assessment_gradings ADD COLUMN item_alternatives jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;