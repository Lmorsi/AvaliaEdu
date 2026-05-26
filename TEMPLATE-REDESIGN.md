# Redesign do Template: Reposicionamento dos Marcadores L

## Problema

A imagem de debug mostrava que:
1. Marcadores L estavam **acima/junto ao QR code** (top: 8mm)
2. Isso causava distorção severa na perspectiva durante a leitura
3. As bolhas de resposta ficavam muito distorcidas após correção

## Solução Implementada (Versão Final)

### Mudanças no `server.js` (linhas 123-126)

**Antes:**
```javascript
top: 8mm; left: 1mm;      // Dentro do header, junto ao QR code
```

**Depois:**
```javascript
top: 55mm; left: 12mm;    // 47mm abaixo do header, afastado das bordas
```

### Novo Layout:
```
┌──────────────────────────────────────────────┐
│  FOLHA DE RESPOSTAS            [QR CODE]     │  ← Header (~35mm)
├──────────────────────────────────────────────┤
│                                              │
│ 20mm (espaço livre)                          │
│                                              │
│  [L]                        [L]              │  ← top: 55mm
│  12mm afastado                12mm afastado  │
│                                              │
│  1  ○ ○ ○ ○     (bolhas)                    │
│  2  ○ ○ ○ ○                                 │
│  ...                                         │
│  [L]                        [L]              │  ← bottom: 2mm
│  12mm afastado                12mm afastado  │
└──────────────────────────────────────────────┘
```

## Impactos Positivos

1. **Melhor Homografia**: Marcadores L encolhem ~30mm do topo, deixando espaço para o QR code
2. **Menos Distorção**: Pontos de canto mais próximos das bolhas de resposta
3. **Câmera em Ângulo**: Perspectiva menos severa na zona de leitura
4. **Detecção de QR**: QR code fica fora da zona de transformação

## Comparação Visual

**Layout Antigo:**
- Top markers: 8mm (dentro do header)
- QR code: também no header
- Resultado: marcadores e QR competem por espaço, distorção severa

**Layout Novo:**
- Top markers: 38mm (abaixo do header/QR)
- QR code: header (8-35mm aprox)
- Resultado: zona de leitura com menos distorção

## Dados Técnicos

- **Header height**: ~35mm (título + QR code + espaço)
- **Top dos marcadores superiores**: 55mm (20mm após header)
- **Left/Right offset**: 12mm (afasta de bordas e QR code)
- **Área de contenção**: 55mm a bottom (últimas bolhas ~250mm)
- **Marcadores inferiores**: `bottom: 2mm` com `left/right: 12mm`

## Testes Recomendados

1. Gerar novo PDF com o redesign
2. Testar leitura em ângulos diversos (30°, 45°, 60°)
3. Verificar detecção de fiduciais no `test_scan.html`
4. Comparar distorção antes/depois com a mesma câmera

## Arquivo Modificado
- `server/server.js` (linha 122-123)

## Status
✓ Implementado
⏳ Awaiting teste em campo com novos PDFs
