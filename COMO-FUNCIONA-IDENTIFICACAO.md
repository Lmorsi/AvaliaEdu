# Como Funciona a Identificação de Alunos e Turmas

## Resumo Executivo

O sistema usa **QR Code inteligente** para identificar automaticamente a turma e correção. O professor só precisa digitar o nome do aluno - o resto é automático.

---

## Fluxo Completo

### 1️⃣ Criação da Avaliação (Professor)

Quando o professor cria uma prova, o sistema:

```
1. Seleciona a TURMA (ex: "3º Ano A")
2. Escolhe os itens
3. Define o gabarito
4. Gera PDF com QR CODE único
```

### 2️⃣ O QR Code Contém TUDO

Cada prova tem um QR Code embutido com:

```json
{
  "assessment_id": "abc-123",
  "class_id": "turma-3ano-a-uuid",  ← IDENTIFICA A TURMA!
  "grading_id": "correcao-456",
  "answer_key": ["A", "B", "C", "D"],
  "item_types": ["multipla_escolha", ...],
  "total_questions": 10,
  "assessment_name": "Prova Matemática"
}
```

**IMPORTANTE**: O `class_id` já vem no QR Code!

### 3️⃣ Escaneamento (Correção)

Professor escaneia a prova:

```
1. Sistema lê o QR Code → extrai class_id
2. Professor digita: "João Silva"
3. Sistema busca: "João Silva" NA TURMA específica (class_id)
4. Cria/encontra o aluno APENAS naquela turma
```

---

## Exemplo Prático

### Cenário: Múltiplas Turmas com Alunos de Mesmo Nome

**Professor tem:**
- Turma A (uuid: aaa-111) com "João Silva"
- Turma B (uuid: bbb-222) com "João Silva" (outro aluno)
- Turma C (uuid: ccc-333) com "João Silva Santos"

**Correção da Prova da Turma A:**

```
1. Prova tem QR Code com class_id = "aaa-111"
2. Professor escaneia e digita: "João Silva"
3. Sistema busca:
   SELECT * FROM grading_students
   WHERE class_id = 'aaa-111'   ← DO QR CODE!
   AND name = 'João Silva'      ← DO CAMPO!
4. Encontra o João Silva correto (da Turma A)
```

**Correção da Prova da Turma B:**

```
1. Prova tem QR Code com class_id = "bbb-222"
2. Professor escaneia e digita: "João Silva"
3. Sistema busca:
   WHERE class_id = 'bbb-222'   ← OUTRO QR CODE!
   AND name = 'João Silva'
4. Encontra o João Silva da Turma B (diferente!)
```

---

## Garantias do Sistema

### ✅ Correspondência Exata
- Nome deve ser **idêntico** (não aproximado)
- "João Silva" ≠ "João Silva Santos"
- Case-sensitive e sem wildcards

### ✅ Isolamento por Turma
- Cada turma tem seu próprio conjunto de alunos
- Constraint: `UNIQUE (class_id, name)`
- Impossível duplicatas na mesma turma
- "João Silva" pode existir em múltiplas turmas diferentes

### ✅ Automático e Seguro
- Professor não precisa escolher turma manualmente
- QR Code garante turma correta
- Sistema cria aluno automaticamente se não existir
- Race conditions tratadas

---

## Código Relevante

### Geração do QR Code (assessmentWithQRCode.ts:47-65)

```typescript
const qrCodeData: QRCodeData = {
  assessment_id: assessmentData.gradingId,
  class_id: assessmentData.classId,  // ← TURMA AQUI!
  grading_id: assessmentData.gradingId,
  answer_key: assessmentData.answerKey,
  // ... mais dados
}
```

### Busca do Aluno (scan-assessment/index.ts:78-81)

```typescript
let { data: student, error: studentError } = await supabase
  .from("grading_students")
  .select("id")
  .eq("class_id", qrData.class_id)  // ← DO QR CODE!
  .eq("name", normalizedStudentName)  // ← DO CAMPO!
  .maybeSingle();
```

### Constraint no Banco (migration:20260308021253)

```sql
ALTER TABLE grading_students
ADD CONSTRAINT grading_students_class_id_name_unique
UNIQUE (class_id, name);
```

---

## Perguntas Frequentes

**Q: E se o professor digitar o nome errado?**
A: Sistema cria um novo aluno com o nome digitado (na turma correta). O professor pode corrigir depois no painel de gerenciamento.

**Q: E se houver dois "João Silva" na mesma turma?**
A: **IMPOSSÍVEL!** O constraint do banco impede. O professor precisaria usar nomes distintos (ex: "João Silva A" e "João Silva B", ou incluir sobrenome completo).

**Q: Como o sistema sabe que é a turma certa?**
A: **O QR Code tem o class_id embutido!** Cada prova impressa já "sabe" de qual turma ela é.

**Q: O professor pode se confundir e escanear prova errada?**
A: Não! O QR Code determina tudo. Mesmo que seja prova de outra turma, o sistema usará a turma correta do QR Code.

---

## Resumo Técnico

| Componente | Responsabilidade |
|------------|------------------|
| **QR Code** | Armazena class_id + gabarito + metadados |
| **Campo "Nome"** | Professor preenche manualmente |
| **Busca no Banco** | `WHERE class_id = [do QR] AND name = [do campo]` |
| **Constraint** | Impede duplicatas: `UNIQUE(class_id, name)` |
| **Auto-criação** | Cria aluno se não existir (na turma correta) |

---

## Conclusão

✅ **Sistema é robusto e automático**
✅ **Não há ambiguidade entre turmas**
✅ **Professor só precisa digitar o nome**
✅ **QR Code faz o resto do trabalho**

O único requisito é que **nomes sejam únicos dentro de cada turma**.
