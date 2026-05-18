/*
  # View items_list para listagem performática

  Cria uma view que trunca texto_item para 300 caracteres para uso na listagem.
  Evita trafegar imagens em base64 (que podem ter centenas de KB por item)
  ao listar/pesquisar itens.

  - items_list: retorna todas as colunas exceto texto_item completo,
    substituindo por texto_item_preview (primeiros 300 chars)
*/

CREATE OR REPLACE VIEW public.items_list AS
SELECT
  id,
  user_id,
  autor,
  disciplina,
  etapa_ensino,
  tipo_item,
  descritor,
  left(texto_item, 300) AS texto_item,
  resposta_correta,
  nivel,
  quantidade_linhas,
  alternativas,
  afirmativas,
  afirmativas_extras,
  gabarito_afirmativas,
  gabarito_afirmativas_extras,
  data_criacao,
  created_at
FROM public.items;
