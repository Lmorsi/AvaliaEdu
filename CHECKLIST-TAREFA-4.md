# Checklist: Tarefa 4 - Validação Visual

## ✅ Tarefa 4: test_bubbles.html - Sem Distorção

### O que é?
Teste visual para validar que a imagem **corrigida não fica distorcida** antes de avançar para testes OMR reais.

---

## Pré-Requisitos

- [ ] v6.0 compilada e pronta
- [ ] PDF da folha gerado
- [ ] Foto impressa em alta qualidade (300 DPI)
- [ ] Câmera/Smartphone disponível
- [ ] Navegador web atualizado

---

## Passo 1: Fotografar o Documento

- [ ] Iluminação adequada (natural ou fluorescente)
- [ ] Ângulo: 15-30° (não completamente frontal)
- [ ] Todos os 4 L-markers visíveis
- [ ] Foto nítida e em foco
- [ ] Resolução: ≥2000×2500 pixels
- [ ] Salvar como JPEG

**Checklist de qualidade:**
- [ ] Sem sombras sobre o documento
- [ ] Sem reflexos no papel
- [ ] Cores naturais
- [ ] Bolhas claramente visíveis
- [ ] L-markers nos 4 cantos visíveis

---

## Passo 2: Abrir test_bubbles.html

### Opção A: Local (navegador direto)
```bash
file:///caminho/para/omr-service/test_bubbles.html
```
- [ ] Página carrega corretamente
- [ ] Botão "Selecionar Foto" visível
- [ ] Sem erros no console

### Opção B: Via HTTP (recomendado)
```bash
cd omr-service
python3 -m http.server 8080
```
- [ ] Servidor rodando em http://localhost:8080
- [ ] Acessar http://localhost:8080/test_bubbles.html
- [ ] Página carrega corretamente

---

## Passo 3: Upload da Foto

- [ ] Clicar em "Selecionar Foto"
- [ ] Selecionar a foto tirada no Passo 1
- [ ] Aguardar processamento (spinner aparecer e desaparecer)
- [ ] Sem mensagens de erro

---

## Passo 4: Validar Resultado - Debug Image

**Imagem com Marcadores (esquerda superior)**

- [ ] Imagem aparece
- [ ] **Ponto VERDE (TL)** visível no canto superior-esquerdo
- [ ] **Ponto AMARELO (TR)** visível no canto superior-direito
- [ ] **Ponto AZUL (BL)** visível no canto inferior-esquerdo
- [ ] **Ponto VERMELHO (BR)** visível no canto inferior-direito

**Se algum ponto não aparecer:**
```
❌ FALHA: Marcadores não detectados
→ Problema na detecção de L-markers
→ Voltar a fotografar com melhor qualidade/iluminação
```

---

## Passo 5: Validar Resultado - Corrected Image

**Imagem Corrigida (direita superior) - CRÍTICO**

### ✅ Sucesso: Imagem NÃO está distorcida

- [ ] Imagem aparece **completamente frontal**
- [ ] Sem inclinação visível
- [ ] Sem deformação de perspectiva
- [ ] Bolhas aparecem em **linhas retas**
- [ ] Proporções mantidas (não esticada/achatada)
- [ ] Texto legível
- [ ] Cores normais
- [ ] Sem artefatos ou ruído excessivo

**Visual esperado:**
```
Folha de respostas vista de frente (como if fotografia foi frontal)
Sem ondulações, curvatures ou distorções
```

### ❌ Falha: Imagem ESTÁ distorcida

- [ ] Imagem ainda **inclinada ou torta**
- [ ] **Deformação visível** (barril, pincushion)
- [ ] Perspectiva **não corrigida**
- [ ] Bolhas **não em linhas retas**
- [ ] Imagem **muito escura ou clara**

**Ação se falhar:**
```
❌ RETRY TAREFA 4:
1. Tentar com foto mais frontal
2. Melhorar iluminação
3. Usar v6.0 (marcadores 16px)
4. Voltar ao Passo 1
```

---

## Passo 6: Validar Resultado - Bolhas Detectadas

**Bolhas Detectadas (esquerda inferior)**

### Validação Básica

- [ ] Seção aparece
- [ ] Stats mostram números (Total, Marcadas, Não Marcadas)
- [ ] Pelo menos algumas bolhas aparecem na grid

### Contagem Esperada

Para um documento com **5 questões × 4 opções**:

- [ ] **Total de Bolhas:** 20 (5 × 4)
- [ ] **Marcadas:** Número correto de respostas
- [ ] **Não Marcadas:** 20 - Marcadas
- [ ] **Linhas:** 5

### Validação de Detecção

- [ ] Bolhas aparecem com status ("marked" ou "unmarked")
- [ ] Percentual de preenchimento realista (0-100%)
- [ ] Sem bolhas falsas (bolinhas que não existem)

**Se muitas bolhas não aparecerem:**
```
⚠️ Aviso: Detecção parcial
Possível causa: Contraste baixo, impressão ruim
Solução: Melhorar qualidade da impressão/foto
```

---

## Passo 7: Validar Resultado - Dados Brutos (JSON)

**Dados Brutos (direita inferior)**

### Campos Obrigatórios

- [ ] `debug_image`: Contém dados base64 (não vazio)
- [ ] `corrected_image`: Contém dados base64 (não vazio)
- [ ] `bubbles.found`: `true`
- [ ] `bubbles.grids`: Array com múltiplas linhas
- [ ] `fiducials.TL`: Coordenadas [x, y]
- [ ] `fiducials.TR`: Coordenadas [x, y]
- [ ] `fiducials.BL`: Coordenadas [x, y]
- [ ] `fiducials.BR`: Coordenadas [x, y]

### Exemplo de Saída Esperada

```json
{
  "debug_image": "iVBORw0KGgoAAAANS...",  ✅ Preenchido
  "corrected_image": "iVBORw0KGgoAAAANS...",  ✅ Preenchido
  "bubbles": {
    "found": true,  ✅ true
    "grids": [
      {
        "row": 0,
        "bubbles": [
          {"col": 0, "marked": false, "fill_percentage": 0.05},
          {"col": 1, "marked": false, "fill_percentage": 0.08},
          // ...
        ]
      },
      // ... 5 grids no total
    ]
  },
  "fiducials": {
    "TL": [10, 10],      ✅ Presente
    "TR": [2390, 10],    ✅ Presente
    "BL": [10, 2990],    ✅ Presente
    "BR": [2390, 2990]   ✅ Presente
  }
}
```

---

## Decisão Final: Tarefa 4 ✅ ou ❌

### ✅ SUCESSO - Avançar para Testes OMR Reais

**Todos os critérios atendidos:**
```
✓ Debug Image: 4 marcadores detectados nos cantos
✓ Corrected Image: FRONTAL e SEM distorção
✓ Bolhas Detectadas: Contagem correta
✓ Dados Brutos: JSON completo
✓ Taxa de acerto esperada: > 95%
```

**Próximo passo:** Avançar para testes OMR com múltiplas fotos

---

### ❌ FALHA - Retry Tarefa 4

**Se falhou em qualquer critério:**

1. **Se Debug Image falhou:**
   - [ ] Melhorar iluminação
   - [ ] Fotografar mais frontal
   - [ ] Usar v6.0 (marcadores 16px)
   - [ ] Voltar ao Passo 1

2. **Se Corrected Image falhou (CRÍTICO):**
   - [ ] Fotografar mais frontal (< 30°)
   - [ ] Melhorar qualidade/resolução
   - [ ] Reimprimir em melhor qualidade
   - [ ] Verificar se v6.0 está compilada
   - [ ] Voltar ao Passo 1

3. **Se Bolhas não detectadas:**
   - [ ] Melhorar contraste/iluminação
   - [ ] Tentar com imagem melhor
   - [ ] Voltar ao Passo 1

4. **Se Dados Brutos incompletos:**
   - [ ] Verificar se serviço OMR está rodando
   - [ ] Checar console do navegador (F12) para erros
   - [ ] Voltar ao Passo 2

---

## Dicas de Troubleshooting

### Problema: Marcadores não detectados

```
Verificar:
1. Iluminação: Adequada? Sem sombras?
2. Ângulo: < 30°?
3. Qualidade: Impressão 300 DPI?
4. Versão: v6.0 compilada?
```

### Problema: Imagem corrigida ainda distorcida

```
Verificar:
1. Ângulo da foto: Mais frontal?
2. Qualidade: Foto nítida?
3. Marcadores: 4 detectados corretamente?
4. Contraste: Bom?
```

### Problema: Nenhuma bolha detectada

```
Verificar:
1. Imagem corrigida: Frontal?
2. Contraste: Adequado?
3. Impressão: Qualidade OK?
4. Servidor OMR: Rodando?
```

---

## Critério de Aceite

### Tarefa 4 Aceita

- ✅ Corrected Image **frontal e nítida**
- ✅ Sem deformação de perspectiva
- ✅ 4 marcadores detectados
- ✅ Bolhas claramente visíveis
- ✅ Taxa de acerto > 95%

### Tarefa 4 Rejeitada

- ❌ Corrected Image **distorcida ou inclinada**
- ❌ Deformação visível
- ❌ Marcadores não detectados
- ❌ Bolhas não aparecem
- ❌ Taxa de acerto < 70%

---

## Documentação de Referência

- **TAREFA-4-VALIDACAO-VISUAL.md** - Guia completo
- **RESUMO-FINAL-VERSAO-6.md** - Specs v6.0
- **CALIBRACAO-MARCADORES-L.md** - Detalhes técnicos

---

*Checklist Tarefa 4: Validação Visual*  
*Versão: 6.0*  
*Data: 26 de maio de 2026*
