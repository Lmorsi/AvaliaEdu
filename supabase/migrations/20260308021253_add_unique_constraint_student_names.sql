/*
  # Adicionar constraint de unicidade para nomes de estudantes

  1. Mudanças
    - Adiciona constraint UNIQUE para (class_id, name) em grading_students
    - Garante que não existam nomes duplicados na mesma turma
    - Remove duplicatas existentes antes de aplicar constraint

  2. Segurança
    - Previne confusão entre estudantes com mesmo nome
    - Garante integridade dos dados de correção
*/

-- Remove duplicatas existentes mantendo apenas o primeiro registro
DO $$
BEGIN
  DELETE FROM grading_students a
  USING grading_students b
  WHERE a.id > b.id
    AND a.class_id = b.class_id
    AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));
END $$;

-- Adiciona constraint de unicidade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'grading_students_class_id_name_unique'
  ) THEN
    ALTER TABLE grading_students 
    ADD CONSTRAINT grading_students_class_id_name_unique 
    UNIQUE (class_id, name);
  END IF;
END $$;