# Solução para Problema de Impressão - Relatórios Compilados

## Problema Identificado

A função `window.print()` do navegador tinha controle limitado sobre a paginação, causando sobreposição de dados nas últimas páginas quando imprimindo relatórios com muitas tabelas e dados.

## Solução Implementada

Substituímos o `window.print()` por uma geração de PDF programática usando a biblioteca **jsPDF**, que já estava instalada no projeto. Isso nos dá controle total sobre:

- Quebras de página
- Posicionamento exato de cada elemento
- Verificação de espaço disponível antes de adicionar conteúdo
- Layout consistente em todas as páginas

## Arquivos Modificados

### 1. Novo Arquivo: `src/utils/compiledReportPDF.ts`

Este arquivo contém a função `generateCompiledReportPDF()` que:

- Recebe os dados do relatório compilado
- Cria um documento PDF página por página
- Adiciona automaticamente novas páginas quando necessário
- Verifica o espaço disponível antes de adicionar cada seção
- Inclui todas as três tabelas principais:
  1. Resultados Consolidados por Turma
  2. Análise Consolidada por Item (Acertos e Erros)
  3. Percentual de Marcação por Alternativa

### 2. Modificado: `src/components/sections/CompiledReportsView.tsx`

- Importa a nova função de geração de PDF
- Substitui o botão "Imprimir" por "Gerar PDF"
- Passa os dados necessários para a função de geração

## Como Funciona

1. **Usuário clica em "Gerar PDF"**: O botão agora chama `generateCompiledReportPDF()` ao invés de `window.print()`

2. **Verificação de espaço**: Antes de adicionar cada elemento, a função verifica se há espaço suficiente na página atual. Se não houver, adiciona uma nova página automaticamente.

3. **Controle de paginação**: A função `checkPageBreak(requiredSpace)` garante que nenhum dado será cortado ou sobreposto.

4. **Download automático**: Ao finalizar, o PDF é automaticamente baixado com um nome descritivo incluindo o nome da avaliação e a data.

## Vantagens da Nova Solução

✅ **Controle total de paginação** - Sem mais sobreposições  
✅ **Layout consistente** - Mesmo resultado em todos os navegadores  
✅ **Arquivo portátil** - PDF pode ser compartilhado facilmente  
✅ **Nomes descritivos** - Arquivos salvos com nome da avaliação e data  
✅ **Formatação otimizada** - Tamanhos de fonte ajustados para caber mais dados  
✅ **Cores preservadas** - Mantém as cores importantes (verde, vermelho, etc.)  

## Melhorias Futuras Possíveis

- Adicionar logo da escola no cabeçalho
- Incluir numeração de páginas
- Adicionar opção de orientação paisagem para tabelas muito largas
- Permitir customização de cores e fontes
- Adicionar gráficos visuais além das tabelas

## Uso

1. Acesse **Relatórios e Estatísticas**
2. Vá para a aba **Dados Compilados entre Turmas**
3. Selecione uma avaliação
4. Selecione as turmas que deseja incluir no relatório
5. Clique em **Gerar PDF**
6. O arquivo será baixado automaticamente

## Observações Técnicas

- A função mantém margens de 15mm em todos os lados
- Usa fontes Helvetica (padrão do jsPDF)
- Tamanho A4 em orientação retrato
- Fonte de 7-12pt dependendo do tipo de conteúdo
- Verifica espaço com folga de segurança para evitar cortes
