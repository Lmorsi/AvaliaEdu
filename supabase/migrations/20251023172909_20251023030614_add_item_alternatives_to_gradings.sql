/*
  # Adicionar campo item_alternatives
  
  1. Alterações
    - Adiciona coluna `item_alternatives` na tabela `assessment_gradings`
      - Armazena as alternativas disponíveis para cada item
      - Permite detectar automaticamente quantas opções cada questão possui
      - Formato: array de arrays de strings (ex: [["A","B","C","D"], ["V","F"], ...])
  
  2. Objetivo
    - Possibilitar análise estatística precisa baseada nas alternativas reais de cada item
    - Mostrar "--" para alternativas inexistentes em itens com menos opções
*/

-- Adicionar coluna item_alternatives se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_gradings' AND column_name = 'item_alternatives'
  ) THEN
    ALTER TABLE assessment_gradings ADD COLUMN item_alternatives jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
