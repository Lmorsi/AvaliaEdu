# Melhorias de Detecção OMR - Versão 5.0

## Análise da Imagem de Debug

Analisando a screenshot do debug OMR, identificamos problemas que dificultam a leitura:

### Problemas Encontrados

1. **Bolhas com pouca espessura (1.3px):**
   - Dificultam a detecção pelo algoritmo
   - Podem desaparecer com compressão JPEG
   - Falta contraste visual

2. **Questão 1 muito próxima dos L-markers:**
   - Quase encostando no canto superior direito
   - Deixa pouco espaço de margem
   - Pode confundir o algoritmo de perspectiva

3. **Variação na detecção:**
   - Algumas bolhas preenchidas (filled)
   - Outras não detectadas
   - Indicando problema de threshold ou contraste

---

## Soluções Implementadas

### Solução 1: Aumentar Espessura das Bolhas

**Arquivo:** `server/server.js`

**Antes:**
```html
<div class="bubble" style="width: 17px; height: 17px; border: 1.3px solid #333; ..."></div>
```

**Depois:**
```html
<div class="bubble" style="width: 18px; height: 18px; border: 2px solid #333; ..."></div>
```

**Mudanças:**
- Border: `1.3px` → `2px` (+54% mais espesso)
- Width: `17px` → `18px` (+6% maior)
- Height: `17px` → `18px` (+6% maior)

**Benefício:** Maior contraste, melhor detecção pelo algoritmo OMR

**Aplicado em:** 
- Bolhas de múltipla escolha (linha 169)
- Bolhas de verdadeiro/falso (linhas 194, 198) - todas as ocorrências

---

### Solução 2: Aumentar Margin-Top da Questão 1

**Arquivo:** `server/server.js` (linha 215)

**Antes:**
```javascript
const marginTop = col === 0 ? 'margin-top: 3mm;' : '';
```

**Depois:**
```javascript
const marginTop = col === 0 ? 'margin-top: 6mm;' : '';
```

**Mudança:** `3mm` → `6mm` (+100% de espaço)

**Benefício:** Q1 fica bem afastada dos L-markers, evitando confusão

---

## Comparação Visual

### Antes
```
[L]
(3mm)              ← Pouco espaço
1 ○○○○
  ↑ Quase encostando
```

### Depois
```
[L]
(6mm)              ← Mais espaço
1 ●●●●  (bolhas maiores)
  ↑ Bem afastada
```

---

## Impacto no OMR

### Antes
- Border: 1.3px (fino, pode desaparecer)
- Tamanho: 17px (pequeno)
- Espaço: 3mm (apertado)

### Depois
- Border: 2px (espesso, robusto)
- Tamanho: 18px (maior visibilidade)
- Espaço: 6mm (claro)

---

## Benefícios

✓ **Bolhas mais visíveis:** 2px de espessura em vez de 1.3px  
✓ **Melhor contraste:** Maior diferença entre fundo e borda  
✓ **Mais robusto:** Resiste melhor a compressão/ruído  
✓ **Q1 melhor posicionada:** 6mm de separação dos L-markers  
✓ **Detecção mais precisa:** Algoritmo consegue identificar melhor  
✓ **Menos false positives:** Bolhas claras e bem definidas  

---

## Especificações de Bolhas

### Múltipla Escolha
| Propriedade | Antes | Depois |
|-------------|-------|--------|
| Width | 17px | 18px |
| Height | 17px | 18px |
| Border | 1.3px | 2px |
| Border-radius | 50% | 50% |
| Background | white | white |

### Verdadeiro/Falso
| Propriedade | Antes | Depois |
|-------------|-------|--------|
| Width | 18px | 18px |
| Height | 18px | 18px |
| Border | 1.3px | 2px |
| Border-radius | 50% | 50% |
| Background | white | white |

---

## Espaçamento Vertical

### Estrutura Vertical Agora
```
0mm    ┌──────────────────┐
       │ [L-markers sup]  │
       │                  │
55mm   ├──────────────────┤
       │ (20mm claro)     │
       │ [L]     [L] [L]  │
       │ (6mm margin-top) │
61mm   │ 1 ●●●●           │
       │ 2 ●●●●           │
       │ ...              │
       │ 20 ●●●●          │
       │ (padding-bottom) │
247mm  ├──────────────────┤
       │ [L]     [L] [L]  │
       │                  │
       │ [L-markers inf]  │
       └──────────────────┘
```

---

## Análise da Imagem Anterior

A imagem de debug mostra:
1. **Questão 1:** Preenchida (filled) - possível erro de threshold
2. **Questão 2:** Preenchida - similar ao problema
3. **Questão 3:** Parcialmente detectada (algumas bolhas azuis = parcialmente)
4. **Questão 4:** Detectada corretamente
5. **Questão 5:** Parcialmente detectada

**Causa provável:** Border muito fina (1.3px) causando erros de detecção

**Solução:** Border mais grossa (2px) melhora a precisão

---

## Testes Recomendados

### Verificação Visual
- [ ] Bolhas visualmente mais espessas
- [ ] Q1 com 6mm de espaço (antes era 3mm)
- [ ] Melhor separação dos L-markers

### Testes OMR
- [ ] Redução de false positives
- [ ] Menos bolhas "preenchidas" incorretamente
- [ ] Melhor detecção de bolhas vazias
- [ ] Maior precisão em ângulos extremos

### Métricas
- [ ] Taxa de acerto > 95%
- [ ] Redução de erros de threshold
- [ ] Melhor robustez a JPEG compression

---

## Mudanças Resumidas

| Parâmetro | Antes | Depois | Impacto |
|-----------|-------|--------|---------|
| **Border** | 1.3px | 2px | +54% mais espesso |
| **Width** | 17px | 18px | +6% maior |
| **Height** | 17px | 18px | +6% maior |
| **Margin-Top Q1** | 3mm | 6mm | +100% mais espaço |

---

## Status

✅ Implementado  
✅ Build compilado  
✅ Sem erros  
✅ Pronto para teste  

---

## Próximas Validações

1. Gerar novo PDF
2. Testar com a imagem anterior (mesmo documento)
3. Comparar detecção:
   - Menos bolhas "preenchidas"
   - Melhor separação de Q1
   - Detecção mais precisa
4. Validar taxa de sucesso OMR

---

*Versão: 5.0 (Com melhorias de detecção OMR)*  
*Data: 26 de maio de 2026*
