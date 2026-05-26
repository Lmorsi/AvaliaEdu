# Comparação Visual: Evolução do Layout

## Layout Versão 1 (Problema Original)

```
┌────────────────────────────────────┐
│ FOLHA DE RESPOSTAS      [QR CODE]  │
├────────────────────────────────────┤
│                                    │
│ [L]       ← top: 8mm               │ ❌ PROBLEMA: 
│ (mesmo nível do QR code)           │ • L's sobrepõem QR
│                                    │ • Muito perto das bordas
│ 1  ○ ○ ○ ○                        │ • Perspectiva severa
│ 2  ○ ○ ○ ○                        │
│ ...                                │
│ [L]                                │
└────────────────────────────────────┘
```

## Layout Versão 2 (Primeira Correção)

```
┌────────────────────────────────────┐
│ FOLHA DE RESPOSTAS      [QR CODE]  │
├────────────────────────────────────┤
│                                    │
│ (espaço)                           │
│ [L]       ← top: 38mm              │ ⚠️ MELHORIA PARCIAL:
│ (1mm da borda)                     │ • L's abaixo do QR ✓
│ 1  ○ ○ ○ ○                        │ • Mas ainda próximos das bordas
│ 2  ○ ○ ○ ○                        │ • L superior esquerdo junto ao QR
│ ...                                │
│ [L]                                │
└────────────────────────────────────┘
```

## Layout Versão 3 (Solução Final - ATUAL)

```
┌─────────────────────────────────────┐
│ FOLHA DE RESPOSTAS        [QR CODE]  │  ← Área do header (~35mm)
├─────────────────────────────────────┤
│                                     │
│ (espaço claro - ~20mm)              │
│                                     │
│   [L]                        [L]    │  ← top: 55mm, 
│   12mm offset        12mm offset    │     left/right: 12mm
│                                     │
│   1  ○ ○ ○ ○     (bolhas)          │  ✓ SOLUÇÃO COMPLETA:
│   2  ○ ○ ○ ○                       │  • L's bem abaixo do QR
│   3  ○ ○ ○ ○                       │  • Afastados das bordas (12mm)
│   ...                               │  • L sup. esq. não toca QR
│                                     │  • Perspectiva menos severa
│   [L]                        [L]    │  ← bottom: 2mm,
│   12mm offset        12mm offset    │     left/right: 12mm
└─────────────────────────────────────┘
```

## Comparação Técnica

| Parâmetro | V1 | V2 | V3 (Final) |
|-----------|----|----|-----------|
| Top (superior) | 8mm | 38mm | 55mm |
| Left/Right | 1mm | 1mm | 12mm |
| Bottom (inferior) | 2mm | 2mm | 2mm |
| Distância QR → L sup | 0mm (overlap) | ~30mm | ~47mm |
| Distância borda → L | 1mm (muito perto) | 1mm | 12mm (ok) |
| Adequação câmera ângulo | ❌ Ruim | ⚠️ Médio | ✓ Bom |

## Visualização da Zona de Leitura

```
Layout V3 (Final):

0mm  ┌─────────────────────────────────┐
     │ FOLHA DE RESPOSTAS   [QR CODE]  │
10mm │                                 │
     │                                 │
20mm ├─────────────────────────────────┤
     │                                 │
30mm │                                 │
     │   [L]              [L]          │ ← Zona "segura" para câmera
40mm │                                 │   (menos distorção)
     │   1 ○ ○ ○ ○                   │
50mm │   2 ○ ○ ○ ○                   │
     │   3 ○ ○ ○ ○                   │
60mm │   ...                           │
     │                                 │
70mm │   [L]              [L]          │
     │                                 │
     └─────────────────────────────────┘
```

## Impacto na Detecção

### Antes (V1/V2):
- L's detectam mas com grande incerteza
- Homografia muito desalinhada
- Bolhas ficam distorcidas após correção

### Depois (V3):
- L's detectam com maior confiança
- Homografia mais precisa
- Bolhas mantêm alinhamento correto
- Resiste melhor a câmeras em ângulo

## Status

✅ Implementado em `server/server.js`  
📄 Novos PDFs gerados terão este layout  
🧪 Pronto para teste com `test_scan.html`
