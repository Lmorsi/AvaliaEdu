# Sistema de Tokens Únicos para QR Codes de Provas

## Visão Geral

Este sistema gera um token criptográfico único para cada aluno em cada prova, permitindo validação segura no backend ao processar correções via QR code.

## Fluxo de Funcionamento

### 1. Geração de Tokens (Frontend/Backend)

Quando um professor gera um PDF de prova:

```typescript
import { createAssessmentTokens } from '@/lib/tokenUtils'

// Criar tokens para todos os alunos da turma
const tokens = await createAssessmentTokens(
  assessmentId,
  studentIds,
  userId,
  qrCodeData
)
```

**Resultado**: Cada aluno recebe um token único:
```
1734000000_a1b2c3d4e5f6g7h8
```

### 2. Incorporar Token no QR Code

Modificar o servidor (`server/server.js`) para incluir o token:

```javascript
// Exemplo de modificação no qrCodeData
const qrCodeData = JSON.stringify({
  assessmentId: assessmentId || 'avaliacao_' + Date.now(),
  nomeAvaliacao: nomeAvaliacao || 'Avaliação',
  studentId: studentId || 'aluno',
  token: tokenUnico,  // NOVO: Token do aluno
  timestamp: Date.now(),
  gabarito: gabaritoEspecifico,
  totalQuestoes: gabaritoEspecifico.length
})
```

### 3. Validação de Token no Backend

Quando um aplicativo de correção lê o QR code:

```typescript
import { validateTokenOnBackend, processToken } from '@/lib/tokenValidation'

// Apenas verificar se existe
const checkResult = await validateTokenOnBackend(token, 'check')

// Ou validar e marcar como processado
const validationResult = await validateTokenOnBackend(token, 'validate')

if (validationResult.valid) {
  // Processar correção
  console.log('Aluno:', validationResult.student_id)
  console.log('Prova:', validationResult.assessment_id)
}
```

### 4. Edge Function Endpoint

**URL**: `{SUPABASE_URL}/functions/v1/validate-assessment-token`

**Método**: `POST`

**Payload**:
```json
{
  "token": "1734000000_a1b2c3d4e5f6g7h8",
  "action": "validate" // ou "check"
}
```

**Resposta (Sucesso)**:
```json
{
  "valid": true,
  "token_id": "uuid-xxx",
  "assessment_id": "uuid-yyy",
  "student_id": "uuid-zzz",
  "is_validated": true,
  "message": "Token validado com sucesso"
}
```

**Resposta (Erro)**:
```json
{
  "valid": false,
  "message": "Token não encontrado ou inválido"
}
```

## Banco de Dados

### Tabela: `assessment_tokens`

```sql
CREATE TABLE assessment_tokens (
  id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL,        -- Referência à prova
  student_id uuid NOT NULL,            -- Referência ao aluno
  user_id uuid NOT NULL,               -- Proprietário da prova
  token text UNIQUE NOT NULL,          -- Token criptográfico único
  qr_code_data jsonb,                  -- Dados completos do QR code
  is_validated boolean DEFAULT false,  -- Se foi processado
  validation_timestamp timestamptz,    -- Quando foi processado
  created_at timestamptz DEFAULT now() -- Quando foi gerado
)
```

### Índices

- `token` (único)
- `assessment_id + student_id` (buscar token de um aluno em uma prova)
- `user_id` (listar tokens do usuário)
- `is_validated` (filtrar tokens processados)

## Segurança

### Row Level Security (RLS)

1. **SELECT**: Apenas o proprietário (user_id) pode ver seus tokens
2. **INSERT**: Apenas o proprietário pode criar tokens
3. **UPDATE**: Service role pode atualizar validação

### Validação

- Tokens são únicos globalmente
- Cada token vinculado a um aluno específico
- Cada token vinculado a uma prova específica
- Timestamps de validação rastreáveis

## Funções Utilitárias

### Frontend (`src/lib/tokenUtils.ts`)

```typescript
// Gerar token único
generateUniqueToken(): string

// Criar tokens para múltiplos alunos
createAssessmentTokens(
  assessmentId: string,
  studentIds: string[],
  userId: string,
  qrCodeData?: any
): Promise<AssessmentToken[]>

// Criar token para um aluno
createSingleToken(
  assessmentId: string,
  studentId: string,
  userId: string,
  qrCodeData?: any
): Promise<AssessmentToken>

// Validar token
validateToken(token: string): Promise<AssessmentToken | null>

// Marcar como validado
markTokenAsValidated(token: string): Promise<boolean>

// Buscar todos os tokens de uma prova
getAssessmentTokens(
  assessmentId: string,
  userId: string
): Promise<AssessmentToken[]>

// Buscar token de um aluno
getStudentToken(
  assessmentId: string,
  studentId: string
): Promise<AssessmentToken | null>

// Verificar se foi validado
isTokenValidated(token: string): Promise<boolean>

// Deletar tokens de uma prova
deleteAssessmentTokens(assessmentId: string): Promise<boolean>
```

### Validação (`src/lib/tokenValidation.ts`)

```typescript
// Validar token (marcar como processado)
validateTokenOnBackend(
  token: string,
  action?: 'validate' | 'check'
): Promise<ValidationResponse>

// Apenas verificar
checkToken(token: string): Promise<ValidationResponse>

// Processar e validar
processToken(token: string): Promise<ValidationResponse>
```

## Integração com Servidor de PDF

### Passo 1: Modificar `server/server.js`

```javascript
// Adicionar no handlePdfRequest após análise dos items
const studentId = finalData.studentId || 'aluno'
const assessmentId = finalData.assessmentId

// Buscar ou criar token para este aluno
let tokenUnico = finalData.token
if (!tokenUnico && studentId && assessmentId) {
  // Usar service role para gerar token
  tokenUnico = generateUniqueToken()
}

// Incluir no QR code
const qrCodeData = JSON.stringify({
  assessmentId: assessmentId,
  nomeAvaliacao: nomeAvaliacao,
  studentId: studentId,
  token: tokenUnico,  // NOVO
  timestamp: Date.now(),
  gabarito: gabaritoEspecifico,
  totalQuestoes: gabaritoEspecifico.length
})
```

### Passo 2: Enviar do Frontend

```typescript
// Em useDashboard.ts, na função generatePDF
const finalData = {
  ...assessmentData,
  ...previewData,
  selectedItems: transformedItems,
  columns: data.columns || assessmentData.colunas,
  assessmentId: assessmentId, // Adicionar
  studentId: studentId,       // Adicionar
  token: tokenUnico           // Adicionar (opcional, server pode gerar)
}
```

## Exemplo de Uso Completo

### 1. Criar Tokens quando PDF é gerado

```typescript
// Quando aluno abre sua prova
const { data: tokenData } = await createSingleToken(
  assessmentId,
  studentId,
  userId,
  { /* dados do QR code */ }
)

console.log('Token gerado:', tokenData.token)
```

### 2. Validar ao processar correção

```typescript
// Quando app de correção lê o QR code
const qrData = JSON.parse(qrCodeContent)
const validationResult = await validateTokenOnBackend(qrData.token, 'validate')

if (validationResult.valid) {
  // Salvar correção com confiança
  await salvarCorrecao({
    tokenId: validationResult.token_id,
    studentId: validationResult.student_id,
    assessmentId: validationResult.assessment_id,
    respostas: respostasDoAluno
  })
}
```

### 3. Relatar tokens processados

```typescript
// Buscar tokens de uma prova
const tokens = await getAssessmentTokens(assessmentId, userId)

// Ver quais foram processados
const processedTokens = tokens.filter(t => t.is_validated)
console.log(`${processedTokens.length}/${tokens.length} provas corrigidas`)
```

## Boas Práticas

1. **Gerar tokens ao criar prova**, não ao download do PDF
2. **Armazenar token no QR code** para referência
3. **Validar token antes de processar** qualquer correção
4. **Rastrear timestamps** de validação para auditoria
5. **Implementar retry logic** em caso de falha na validação
6. **Usar HTTPS** em produção para segurança

## Troubleshooting

### Token não encontrado

- Verificar se token foi gerado antes do download
- Verificar se QR code contém o token correto
- Verificar se Edge Function está acessível

### Erro ao validar

- Verificar conexão com backend
- Verificar se Service Role Key está configurada
- Verificar logs da Edge Function em Supabase Dashboard

### Tokens duplicados

- Usar `UNIQUE` constraint na tabela
- Verificar se `generateUniqueToken()` está funcionando
- Adicionar random suffix mais longo se necessário
