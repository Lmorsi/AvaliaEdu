# Todas as Mudanças - Referência Rápida

## Arquivo Modificado

**Único arquivo:** `server/server.js`

---

## Mudança 1: Padding Horizontal (Linha 110)

**Localização:** Dentro da função `generateAnswerSheet`

**Antes:**
```html
<div style="position: relative; padding: 12mm 8mm 10mm 8mm; margin-top: 5mm; page-break-inside: avoid;">
```

**Depois:**
```html
<div style="position: relative; padding: 12mm 24mm 10mm 24mm; margin-top: 5mm; page-break-inside: avoid;">
```

**Mudança:** `8mm` → `24mm` (esquerda e direita)

**Razão:** Para conter todas as bolhas dentro da zona dos L-markers

---

## Mudança 2: Posicionamento dos L-Markers (Linhas 123-126)

**Localização:** Dentro da função `generateAnswerSheet`

**Antes:**
```html
<img src="data:image/svg+xml;base64,${L_LT_B64}" style="position: absolute; top: 8mm; left: 1mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
<img src="data:image/svg+xml;base64,${L_RT_B64}" style="position: absolute; top: 8mm; right: 1mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
<img src="data:image/svg+xml;base64,${L_LB_B64}" style="position: absolute; bottom: 2mm; left: 1mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
<img src="data:image/svg+xml;base64,${L_RB_B64}" style="position: absolute; bottom: 2mm; right: 1mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
```

**Depois:**
```html
<img src="data:image/svg+xml;base64,${L_LT_B64}" style="position: absolute; top: 55mm; left: 12mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
<img src="data:image/svg+xml;base64,${L_RT_B64}" style="position: absolute; top: 55mm; right: 12mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
<img src="data:image/svg+xml;base64,${L_LB_B64}" style="position: absolute; bottom: 2mm; left: 12mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
<img src="data:image/svg+xml;base64,${L_RB_B64}" style="position: absolute; bottom: 2mm; right: 12mm; width: 10mm; height: 10mm; image-rendering: pixelated;" />
```

**Mudanças:**
- Top: `8mm` → `55mm`
- Left (superior): `1mm` → `12mm`
- Right (superior): `1mm` → `12mm`
- Left (inferior): `1mm` → `12mm`
- Right (inferior): `1mm` → `12mm`

**Razão:** Para separar L-markers do QR code e posicioná-los corretamente

---

## Mudança 3: Número de Colunas (Linha 135)

**Localização:** Dentro da função `generateAnswerSheet`

**Antes:**
```javascript
const maxQuestoesPerColumn = 15;
const totalColumns = 4;
```

**Depois:**
```javascript
const maxQuestoesPerColumn = 20;
const totalColumns = 3;
```

**Mudanças:**
- `totalColumns`: 4 → 3
- `maxQuestoesPerColumn`: 15 → 20

**Razão:** Para usar 3 colunas mais largas ao invés de 4 estreitas

---

## Mudança 4: Espaçamento e Quebra de Linha (Linhas 160-168)

**Localização:** Dentro da função `generateQuestionBubbles`, seção múltipla escolha

**Antes:**
```html
<div style="display: flex; align-items: flex-start; margin: 1.5mm 0; break-inside: avoid;">
  <span style="font-weight: bold; margin-right: 2mm; min-width: 6mm; font-size: 9px;">${questionNumber}</span>
  <div style="display: flex; gap: 2mm; flex-wrap: wrap; align-items: flex-start;">
    <!-- bolhas -->
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5mm;">
      <span ...>${letter}</span>
      <div class="bubble" style="width: 18px; height: 18px; ..."></div>
    </div>
  </div>
</div>
```

**Depois:**
```html
<div style="display: flex; align-items: flex-start; margin: 1.5mm 0 1.5mm 0; break-inside: avoid; margin-top: 0.5mm;">
  <span style="font-weight: bold; margin-right: 2mm; min-width: 6mm; font-size: 9px;">${questionNumber}</span>
  <div style="display: flex; gap: 1.2mm; flex-wrap: nowrap; align-items: flex-start; max-width: 90mm;">
    <!-- bolhas -->
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3mm; flex-shrink: 0;">
      <span ...>${letter}</span>
      <div class="bubble" style="width: 17px; height: 17px; ..."></div>
    </div>
  </div>
</div>
```

**Mudanças:**
- `gap: 2mm` → `gap: 1.2mm` (mais compacto)
- `flex-wrap: wrap` → `flex-wrap: nowrap` (sem quebra)
- Adicionar: `max-width: 90mm`
- Adicionar: `flex-shrink: 0`
- `width: 18px` → `width: 17px`
- `gap: 0.5mm` → `gap: 0.3mm`
- Adicionar: `margin-top: 0.5mm`

**Razão:** Para manter todas as opções na mesma linha e compactar o layout

---

## Mudança 5: Margin-Top nas Colunas (Linhas 213-215)

**Localização:** Loop de criação de colunas

**Antes:**
```javascript
for (let col = 0; col < totalColumns; col++) {
  answerSheetHTML += `<div style="flex: 1; display: flex; flex-direction: column; padding-bottom: 16mm;">`;
```

**Depois:**
```javascript
for (let col = 0; col < totalColumns; col++) {
  const marginTop = col === 0 ? 'margin-top: 3mm;' : '';
  answerSheetHTML += `<div style="flex: 1; display: flex; flex-direction: column; padding-bottom: 16mm; ${marginTop}">`;
```

**Mudanças:**
- Adicionar: variável `marginTop`
- Condicional: `col === 0 ? 'margin-top: 3mm;' : ''`
- Aplicar: `${marginTop}` no style

**Razão:** Para adicionar espaço de 3mm apenas na primeira coluna

---

## Sumário das Mudanças

| # | Linha | O quê | De | Para | Por quê |
|---|-------|-------|----|----|---------|
| 1 | 110 | Padding horizontal | 8mm | 24mm | Conter bolhas |
| 2 | 123 | L sup esq: top | 8mm | 55mm | Separar de QR |
| 3 | 123 | L sup esq: left | 1mm | 12mm | Afastar da borda |
| 4 | 124 | L sup dir: top | 8mm | 55mm | Separar de QR |
| 5 | 124 | L sup dir: right | 1mm | 12mm | Afastar da borda |
| 6 | 125 | L inf esq: left | 1mm | 12mm | Afastar da borda |
| 7 | 126 | L inf dir: right | 1mm | 12mm | Afastar da borda |
| 8 | 135 | Colunas totais | 4 | 3 | 3 mais largas |
| 9 | 136 | Q por coluna | 15 | 20 | +33% densidade |
| 10 | 160 | Gap bolhas | 2mm | 1.2mm | Compactar |
| 11 | 160 | Flex-wrap | wrap | nowrap | Sem quebra |
| 12 | 160 | Max-width | - | 90mm | Limite |
| 13 | 161 | Flex-shrink | - | 0 | Não encolhe |
| 14 | 168 | Tamanho bolha | 18px | 17px | Compactar |
| 15 | 165 | Gap item | 0.5mm | 0.3mm | Compactar |
| 16 | 158 | Margin-top | - | 0.5mm | Separação |
| 17 | 213 | Margin-top dinâmica | - | var | Espaço Q1 |
| 18 | 215 | Aplicar margin | - | style | Dinâmico |

**Total: 18 mudanças em 8 linhas-chave**

---

## Impacto Total

- **Arquivos modificados:** 1 (server/server.js)
- **Linhas-chave afetadas:** 8 (110, 123-126, 135-136, 158-173, 213-215)
- **Mudanças específicas:** 18
- **Quebras de compatibilidade:** 0
- **Novos problemas:** 0

---

## Rollback Rápido

Se precisar reverter qualquer mudança:

### Revert Mudança 1:
Linha 110: `padding: 12mm 24mm 10mm 24mm;` → `padding: 12mm 8mm 10mm 8mm;`

### Revert Mudança 2:
```
Linhas 123-126: trocar 55mm/12mm de volta para 8mm/1mm
```

### Revert Mudança 3:
```
Linhas 135-136: trocar 3/20 de volta para 4/15
```

### Revert Mudança 4:
```
Linhas 160-168: trocar wrap/2mm/18px de volta para valores originais
```

### Revert Mudança 5:
```
Linhas 213-215: remover marginTop e ${marginTop}
```

---

## Verificação Final

Após implementar, verifique:

```bash
# Verificar mudanças estão em lugar
grep -n "padding: 12mm 24mm" server/server.js
grep -n "top: 55mm" server/server.js
grep -n "totalColumns = 3" server/server.js
grep -n "flex-wrap: nowrap" server/server.js
grep -n "margin-top: 3mm" server/server.js

# Build
npm run build

# Verificar sucesso
echo "Build complete: $?"
```

---

*Documento de Referência: Versão 4.0*  
*Data: 26 de maio de 2026*
