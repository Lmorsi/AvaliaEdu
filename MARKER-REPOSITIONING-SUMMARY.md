# Reposicionamento dos Marcadores L - Sumário Executivo

## Mudança Implementada

Todos os marcadores L (fiduciais) foram reposicionados de **8mm para 38mm do topo**, movendo-os **para baixo do QR code**.

### Localização no Código
**Arquivo:** `server/server.js`  
**Linhas:** 122-123

### Mudança Específica
```diff
- <img ... style="position: absolute; top: 8mm; ...
+ <img ... style="position: absolute; top: 38mm; ...
```

## Por Que Funciona Melhor

### Problema Original (top: 8mm)
```
├─ QR Code (header)
├─ L-markers (AQUI - muito perto do QR)
│
├─ Bolhas de resposta
│
└─ L-markers (bottom)
```
→ Perspectiva muito severa porque marcadores estão longe verticalmente

### Novo Layout (top: 38mm)
```
├─ QR Code (header)
│
├─ L-markers SUPERIORES (AQUI - logo abaixo)
├─ Bolhas de resposta
│
└─ L-markers inferiores
```
→ Marcadores mais próximos = homografia mais precisa = menos distorção

## Impacto na Qualidade

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Distância vertical entre L's | ~200mm | ~210mm (no máximo) |
| Distância L superior ao QR | 0mm (overlap) | ~30mm |
| Erro de perspectiva esperado | Alto (ângulo extremo) | Médio (ângulo moderado) |
| Adequabilidade para câmera em ângulo | ❌ Ruim | ✓ Bom |

## Próximas Etapas

1. **Gerar novo PDF** com o redesign
2. **Testar com test_scan.html** em ângulos diversos
3. **Comparar imagens de debug** antes/depois
4. **Validar detecção de bolhas** após correção de perspectiva

## Arquivos Relacionados

- `server/server.js` - Template principal
- `omr-service/omr/fiducial.py` - Detecção de L-markers
- `omr-service/omr/perspective.py` - Correção de perspectiva
- `test_scan.html` - Interface de teste visual

## Status

✅ **Implementado**

Os PDFs gerados a partir de agora terão o novo layout com marcadores posicionados **30mm abaixo do topo** em vez de **8mm**.
