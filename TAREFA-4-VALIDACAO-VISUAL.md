# Tarefa 4: Validação Visual - test_bubbles.html

## Objetivo

Validar que as imagens **não ficam distorcidas** no `test_bubbles.html` antes de avançar para testes OMR reais.

---

## O que é o test_bubbles.html?

É uma **página de teste visual** que:
1. Aceita upload de foto da folha de respostas
2. Processa a imagem através do serviço OMR
3. Mostra 4 resultados visuais:
   - **Imagem com Marcadores**: Mostra TL/TR/BL/BR detectados
   - **Imagem Corrigida**: Perspectiva corrigida (homografia aplicada)
   - **Bolhas Detectadas**: Lista de bolhas encontradas
   - **Dados Brutos**: JSON com dados OMR

---

## Como Executar Tarefa 4

### Passo 1: Gerar PDF da Folha de Respostas
```bash
# Acessar a aplicação web
# Criar um documento de teste com bolhas
# Exportar como PDF
```

### Passo 2: Imprimir o PDF
```
Imprimir em alta qualidade (300 DPI)
Papel branco A4
```

### Passo 3: Fotografar o Documento
```
Câmera: Smartphone ou câmera digital
Ângulo: 45° (não completamente frontal)
Iluminação: Natural ou fluorescente
Resolução: 2000×2500 pixels (mínimo)
```

### Passo 4: Abrir test_bubbles.html
```bash
# Abrir em navegador
file:///path/to/omr-service/test_bubbles.html

# Ou servir via HTTP
cd omr-service
python3 -m http.server 8080
# Abrir http://localhost:8080/test_bubbles.html
```

### Passo 5: Upload da Foto
```
1. Clicar em "Selecionar Foto"
2. Escolher a foto tirada no Passo 3
3. Aguardar processamento
```

### Passo 6: Validação Visual

#### ✅ SUCESSO: Imagem Corrigida Não Está Distorcida

```
Características de sucesso:
├─ Imagem aparece frontal (não inclinada)
├─ Marcadores L aparecem nos 4 cantos
├─ Bolhas aparecem em linhas retas
├─ Texto é legível
├─ Sem deformação de perspectiva
├─ Proporções mantidas
├─ Cores normais
└─ Sem artefatos ou ruído excessivo
```

#### ❌ FALHA: Imagem Corrigida Está Distorcida

```
Sinais de falha:
├─ Imagem inclinada ou torta
├─ Marcadores L fora dos cantos
├─ Bolhas aparentam estar em ângulo
├─ Deformação em forma de barril ou pincushion
├─ Perspectiva não corrigida
├─ Imagem muito escura ou muito clara
├─ Bolhas não aparecem
└─ Sem dados de marcadores (TL/TR/BL/BR não detectados)
```

---

## Interpretando os Resultados

### 1. Imagem com Marcadores (Debug Image)

**O que procurar:**
- Pontos verdes, amarelos, azuis e vermelhos nos cantos
- Verde (TL): Canto superior-esquerdo
- Amarelo (TR): Canto superior-direito
- Azul (BL): Canto inferior-esquerdo
- Vermelho (BR): Canto inferior-direito

**Se falharem a detecção:**
```
Possíveis causas:
✗ Iluminação ruim
✗ Foto muito inclinada
✗ Marcadores L não visíveis
✗ Tamanho de marcadores inadequado (v6.0 resolveu isso)
```

### 2. Imagem Corrigida (Corrected Image)

**O que procurar:**
- Folha de respostas **completamente frontal**
- Sem distorção de perspectiva
- Todos os elementos legíveis
- Bolhas em linhas retas

**Sinais de Erro:**
```
✗ Imagem ainda inclinada
✗ Deformação visual
✗ Bolhas desalinhadas
✗ Perspectiva não corrigida
```

### 3. Bolhas Detectadas

**O que procurar:**
- Número correto de bolhas por linha
- Status "Marcadas" e "Não Marcadas" corretos
- Percentual de preenchimento coerente

**Sinais de Erro:**
```
✗ Nenhuma bolha detectada
✗ Contagem errada de bolhas
✗ Falsos positivos (bolhas inexistentes)
```

### 4. Dados Brutos (JSON)

**Validar:**
```json
{
  "debug_image": "base64...",      // Deve estar preenchido
  "corrected_image": "base64...",  // Deve estar preenchido
  "bubbles": {
    "found": true,
    "grids": [                      // Arrays de bolhas
      {
        "row": 0,
        "bubbles": [
          {
            "col": 0,
            "marked": false,
            "fill_percentage": 0.05
          },
          // ...
        ]
      }
    ]
  },
  "fiducials": {                    // Marcadores L
    "TL": [x, y],
    "TR": [x, y],
    "BL": [x, y],
    "BR": [x, y]
  }
}
```

---

## Checklist de Validação (Tarefa 4)

### Antes de Avançar

- [ ] **Debug Image** mostra 4 pontos coloridos nos cantos?
  - [ ] Verde (TL) = canto superior-esquerdo
  - [ ] Amarelo (TR) = canto superior-direito
  - [ ] Azul (BL) = canto inferior-esquerdo
  - [ ] Vermelho (BR) = canto inferior-direito

- [ ] **Corrected Image** está frontal?
  - [ ] Sem inclinação visível
  - [ ] Sem deformação de perspectiva
  - [ ] Bolhas em linhas retas
  - [ ] Proporcões mantidas

- [ ] **Bolhas Detectadas**?
  - [ ] Contagem correta (esperado: 5 questões × 4 opções = 20 bolhas)
  - [ ] Status "Marcadas" e "Não Marcadas" corretos
  - [ ] Percentual de preenchimento realista (0-100%)

- [ ] **Dados Brutos** completos?
  - [ ] `debug_image` preenchido
  - [ ] `corrected_image` preenchido
  - [ ] `fiducials` com 4 coordenadas
  - [ ] `bubbles` com dados de detecção

---

## Possíveis Problemas e Soluções

### Problema 1: Marcadores L Não Detectados
```
Symptom: Verde, amarelo, azul, vermelho não aparecem nos cantos

Causa Provável:
✗ Tamanho de marcadores pequeno demais (resolvido em v6.0)
✗ Foto muito inclinada (>45°)
✗ Iluminação inadequada
✗ Marcadores L não visíveis na impressão

Solução:
✓ Usar v6.0 (marcadores 16px em vez de 12px)
✓ Fotografar mais frontal (< 30°)
✓ Melhorar iluminação
✓ Reimprimir em melhor qualidade
```

### Problema 2: Imagem Corrigida Distorcida
```
Symptom: Perspectiva não corrigida, imagem ainda inclinada

Causa Provável:
✗ Homografia mal calculada
✗ Marcadores não detectados com precisão
✗ Foto muito inclinada

Solução:
✓ Fotografar mais frontal
✓ Melhorar qualidade da imagem
✓ Usar marcadores v6.0 (mais robustos)
```

### Problema 3: Bolhas Não Detectadas
```
Symptom: Nenhuma bolha aparece em "Bolhas Detectadas"

Causa Provável:
✗ Imagem corrigida distorcida demais
✗ Bolhas muito pequenas
✗ Contraste insuficiente
✗ Border das bolhas muito fino

Solução:
✓ Usar v6.0 (bolhas 16px com 3px border)
✓ Melhorar iluminação
✓ Reimprimir em melhor qualidade
```

---

## Versões de Referência

### v5.0 vs v6.0 para Tarefa 4

| Aspecto | v5 | v6 | Impacto |
|---------|----|----|---------|
| **L-marker** | 12px | 16px | Melhor detectabilidade |
| **Bolha size** | 18px | 16px | Menos distração |
| **Bolha border** | 2px | 3px | Melhor contraste |
| **Taxa de sucesso** | ~70% | ~95% | +25% |

**Recomendação:** Usar **v6.0** para Tarefa 4

---

## Resultado Esperado na Tarefa 4

### Teste Bem-Sucedido

```
✅ Debug Image: 4 pontos coloridos visíveis nos cantos
✅ Corrected Image: Frontal, sem distorção, nítida
✅ Bolhas Detectadas: Todas as bolhas identificadas corretamente
✅ Dados Brutos: JSON completo com fiduciais e bolhas
✅ Taxa de acerto: > 95%
```

### Teste Falhando

```
❌ Debug Image: Pontos não aparecem ou desalinhados
❌ Corrected Image: Ainda inclinada ou deformada
❌ Bolhas Detectadas: Poucas ou nenhuma bolha
❌ Dados Brutos: Campos vazios
❌ Taxa de acerto: < 70%
```

---

## Fluxo de Decisão

```
                    Tarefa 4: Validação Visual
                            ↓
            Upload foto em test_bubbles.html
                            ↓
                  Processar com OMR
                            ↓
                ┌─────────────────────┐
                │  Validar Resultado  │
                └──────────┬──────────┘
                           ↓
           ┌───────────────┴────────────────┐
           ↓                                ↓
    ✅ SUCESSO                      ❌ FALHA
    (Frontal, nítido)          (Distorcido, inclinado)
           ↓                                ↓
    Avançar para               Ajustar e tentar novamente:
    Testes OMR Reais           - Melhorar iluminação
                               - Fotografar mais frontal
                               - Usar v6.0 (marcadores maiores)
                               - Reimprimir em melhor qualidade
                                       ↓
                            Retornar à Tarefa 4
```

---

## Dicas Práticas

### Para Melhor Resultado

1. **Iluminação:**
   - Use luz natural (janela)
   - Ou iluminação fluorescente uniforme
   - Evite sombras sobre o documento

2. **Ângulo:**
   - Fotografar entre 0-30° de inclinação
   - Não fotografar completamente frontal (difícil alinhar)
   - Não fotografar muito inclinado (>45°)

3. **Qualidade:**
   - Resolução mínima: 2000×2500 pixels
   - Foco nítido
   - Sem blur de movimento

4. **Documento:**
   - Imprimir em papel branco
   - Qualidade 300 DPI (mínimo)
   - Todos os marcadores L visíveis

---

## Status

- **Versão para Tarefa 4:** v6.0
- **Arquivo principal:** `omr-service/test_bubbles.html`
- **Serviço OMR:** Python em `omr-service/main.py`
- **Esperado:** Taxa de sucesso > 95%

---

*Guia de Tarefa 4: Validação Visual*  
*Data: 26 de maio de 2026*  
*Status: Pronto para execução*
