/*
  # Forçar Reload do Schema Cache

  1. Objetivo
    - Forçar o PostgREST a recarregar o schema cache
    - Garantir que todas as tabelas sejam reconhecidas pela API REST
    
  2. Ações
    - Adiciona comentários nas tabelas para forçar atualização
    - Notifica o PostgREST sobre mudanças no schema
*/

-- Adicionar comentários nas tabelas para forçar reload do schema
COMMENT ON TABLE items IS 'Tabela de questões/itens de avaliação';
COMMENT ON TABLE assessments IS 'Tabela de avaliações criadas pelos professores';
COMMENT ON TABLE classes IS 'Tabela de turmas';
COMMENT ON TABLE students IS 'Tabela de alunos';
COMMENT ON TABLE folders IS 'Tabela de pastas para organização';
COMMENT ON TABLE assessment_gradings IS 'Tabela de correções de avaliações';
COMMENT ON TABLE student_results IS 'Tabela de resultados dos alunos';
COMMENT ON TABLE question_statistics IS 'Tabela de estatísticas das questões';
COMMENT ON TABLE user_profiles IS 'Tabela de perfis de usuários';
COMMENT ON TABLE user_feedback IS 'Tabela de feedback dos usuários';

-- Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
