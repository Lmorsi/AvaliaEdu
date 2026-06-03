# Compiled Report PDF Utilities

## Arquivos Criados

### 1. `src/utils/compiledReportPDF.ts`
Utilitário para gerar relatórios compilados de avaliações em texto e CSV.

**Funções principais:**
- `generateCompiledReport()` - Gera relatório formatado em texto
- `downloadCompiledReport()` - Baixa relatório como arquivo .txt
- `generateCSVReport()` - Gera relatório em formato CSV
- `downloadCSVReport()` - Baixa relatório como arquivo .csv
- `calculateStatistics()` - Calcula estatísticas dos resultados (média, máxima, mínima, mediana, desvio padrão)

### 2. `src/hooks/useCompiledReport.ts`
Hook React para gerenciar a geração de relatórios com Supabase.

**Recursos:**
- Busca automaticamente dados da avaliação e resultados do banco de dados
- Calcula estatísticas em tempo real
- Gerencia estado de carregamento e erros
- Suporta download em múltiplos formatos

**Uso:**
```typescript
const { loading, error, fetchAssessmentResults, generateAndDownloadReport } = useCompiledReport();

// Buscar resultados
const reportData = await fetchAssessmentResults(assessmentId);

// Gerar e baixar relatório
generateAndDownloadReport(reportData, 'txt'); // ou 'csv'
```

### 3. `src/components/CompiledReportViewer.tsx`
Componente React para exibir e gerenciar relatórios compilados.

**Características:**
- Visualização de estatísticas em cards (total de estudantes, médias, máximas, mínimas)
- Tabela interativa com resultados individuais
- Botões para download em TXT e CSV
- Estados de carregamento e erro
- Design responsivo

**Uso:**
```tsx
<CompiledReportViewer 
  assessmentId="assessment-123" 
  assessmentTitle="Prova de Matemática"
/>
```

## Integração com Supabase

O sistema consulta as seguintes tabelas:
- `assessments` - Dados da avaliação
- `assessment_gradings` - Resultados individuais dos estudantes

## Recursos Principais

1. **Estatísticas Automáticas**
   - Pontuação média
   - Pontuação máxima e mínima
   - Mediana
   - Desvio padrão

2. **Múltiplos Formatos de Exportação**
   - Texto formatado (.txt)
   - CSV para análise em Excel (.csv)

3. **Interface Responsiva**
   - Design adaptado para mobile e desktop
   - Tabelas com scroll horizontal
   - Cards informativos

4. **Tratamento de Erros**
   - Feedback claro ao usuário
   - Estados de carregamento
   - Mensagens de erro descritivas

## Próximas Etapas

Para integrar ao seu aplicativo:

1. Importe o componente em suas páginas:
```tsx
import { CompiledReportViewer } from '@/components/CompiledReportViewer';
```

2. Use em suas rotas:
```tsx
<CompiledReportViewer 
  assessmentId={assessment.id} 
  assessmentTitle={assessment.title}
/>
```

3. Customize as cores e estilos conforme necessário (usa Tailwind CSS)
