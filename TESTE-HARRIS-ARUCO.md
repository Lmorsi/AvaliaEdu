# Guia de Teste: Harris Corner Detection + ArUco

## Checklist de Testes

### 1. Teste Básico (Condições Ideais)

**Objetivo**: Validar detecção em cenário ideal

**Procedimento**:
1. Imprimir PDF do cartão resposta em impressora padrão
2. Fotografar com câmera em posição frontal
3. Enviar para OMR service
4. Verificar resultado

**Esperado**:
- `Final corners via ARUCO`
- 4 marcadores detectados
- Perspectiva corrigida
- Bolhas detectadas corretamente

**Logs**:
```
INFO:omr.fiducial:Detectados 4 marcadores ArUco
INFO:omr.fiducial:✓ ArUco marker detection succeeded
```

---

### 2. Teste de Iluminação Não Uniforme

**Objetivo**: Validar detecção com iluminação variável

**Procedimento**:
1. Fotografar cartão com luz lateral ou parcial
2. Criar sombras na imagem
3. Enviar para OMR service

**Esperado**:
- Fallback para `HARRIS` se ArUco falhar
- 4 cantos detectados por Harris
- Perspectiva corrigida adequadamente

**Logs**:
```
WARNING:omr.fiducial:Nenhum marcador ArUco detectado
INFO:omr.fiducial:Harris corner TL: (x, y)
INFO:omr.fiducial:✓ Harris Corner Detection succeeded
```

---

### 3. Teste de Câmera em Ângulo

**Objetivo**: Validar perspectiva em imagem distorcida

**Procedimento**:
1. Fotografar cartão em ângulo ~30°
2. Enviar para OMR service
3. Verificar correção de perspectiva

**Esperado**:
- ArUco detecta mesmo em ângulo
- Imagem corrigida para frontal
- Bolhas detectadas após correção

**Notas**:
- ArUco é invariante a rotação
- Esperar método: `ARUCO`

---

### 4. Teste de Qualidade de Impressão Baixa

**Objetivo**: Validar robustez com impressão degradada

**Procedimento**:
1. Imprimir com toner baixo ou impressora antiga
2. Fotografar
3. Enviar para OMR service

**Esperado**:
- ArUco pode falhar (padrão degradado)
- Harris detecta mesmo com marcadores fracos
- Fallback para edge detection se necessário

**Logs esperados**:
```
INFO:omr.fiducial:Detectados X marcadores ArUco (X < 4)
INFO:omr.fiducial:Attempting Harris Corner Detection...
INFO:omr.fiducial:✓ Harris Corner Detection succeeded
```

---

### 5. Teste de Oclusão Parcial

**Objetivo**: Validar robustez com marcadores parcialmente ocluídos

**Procedimento**:
1. Fotografar cartão com marcador parcialmente coberto (dedo, papel, etc)
2. Enviar para OMR service

**Esperado**:
- ArUco pode falhar com oclusão (padrão incompleto)
- Harris ainda detecta canto mesmo parcialmente ocluído
- Detecção bem-sucedida

---

### 6. Teste de Escala (Diferentes Distâncias)

**Objetivo**: Validar detecção em diferentes escalas

**Procedimento**:
1. Fotografar a 10cm de distância
2. Fotografar a 30cm de distância
3. Fotografar a 50cm+ de distância
4. Enviar todas para OMR service

**Esperado**:
- Detecção funciona em todas as escalas
- Redimensionamento (900px width) normaliza

---

## Verificação de Logs

### Logs Esperados por Método

#### ArUco Sucesso
```
INFO:omr.fiducial:Attempting ArUco marker detection...
INFO:omr.fiducial:Detectados 4 marcadores ArUco
INFO:omr.fiducial:ArUco ID 0: centro em (50.1, 50.1)
INFO:omr.fiducial:ArUco ID 1: centro em (849.9, 50.1)
INFO:omr.fiducial:ArUco ID 3: centro em (849.9, 1598.9)
INFO:omr.fiducial:ArUco ID 2: centro em (50.1, 1598.9)
INFO:omr.fiducial:Cantos ArUco: TL=[50.1, 50.1], TR=[849.9, 50.1], BR=[849.9, 1598.9], BL=[50.1, 1598.9]
INFO:omr.fiducial:✓ ArUco marker detection succeeded
INFO:omr.fiducial:Final corners via ARUCO (TL,TR,BR,BL): [[50.1, 50.1], [849.9, 50.1], [849.9, 1598.9], [50.1, 1598.9]]
```

#### Harris Fallback
```
INFO:omr.fiducial:Attempting ArUco marker detection...
WARNING:omr.fiducial:Nenhum marcador ArUco detectado
INFO:omr.fiducial:Attempting Harris Corner Detection...
INFO:omr.fiducial:Usando Harris Corner Detection como fallback...
INFO:omr.fiducial:Harris corner TL: (52.3, 51.7)
INFO:omr.fiducial:Harris corner TR: (847.8, 50.2)
INFO:omr.fiducial:Harris corner BR: (848.1, 1597.9)
INFO:omr.fiducial:Harris corner BL: (51.9, 1598.3)
INFO:omr.fiducial:Cantos ArUco: TL=[52.3, 51.7], TR=[847.8, 50.2], BR=[848.1, 1597.9], BL=[51.9, 1598.3]
INFO:omr.fiducial:✓ Harris Corner Detection succeeded
INFO:omr.fiducial:Final corners via HARRIS (TL,TR,BR,BL): [[52.3, 51.7], [847.8, 50.2], [848.1, 1597.9], [51.9, 1598.3]]
```

#### Edge Detection Fallback
```
INFO:omr.fiducial:Attempting ArUco marker detection...
WARNING:omr.fiducial:Nenhum marcador ArUco detectado
INFO:omr.fiducial:Attempting Harris Corner Detection...
WARNING:omr.fiducial:Harris detection: apenas X/4 marcadores detectados
INFO:omr.fiducial:Attempting content area edge detection...
INFO:omr.fiducial:Edge detection: found edges
INFO:omr.fiducial:✓ Content area edge detection succeeded
INFO:omr.fiducial:Final corners via EDGES (TL,TR,BR,BL): [[48.0, 48.0], [851.0, 48.0], [851.0, 1600.0], [48.0, 1600.0]]
```

---

## Métricas de Desempenho

### Tempo de Processamento Esperado

Por método (para imagem 900x1600):
- ArUco: ~100-150ms
- Harris: ~150-200ms  (4x ROI analysis)
- Edge: ~50-80ms
- Rectangle: ~80-120ms

**Total esperado**: 100-150ms (apenas o primeiro sucesso)

---

## Troubleshooting

### Problema: ArUco sempre falha
**Verificação**:
1. Verificar se marcadores aparecem no PDF
2. Verificar qualidade de impressão
3. Verificar iluminação
4. Tentar Harris (deve funcionar)

### Problema: Harris também falha
**Verificação**:
1. Verificar se há contraste suficiente
2. Tentar Edge Detection (log deve mostrar)
3. Verificar resolução da imagem

### Problema: Perspectiva incorreta
**Verificação**:
1. Verificar se cantos estão corretos (TL, TR, BR, BL order)
2. Verificar se imagem está muito em ângulo (>45°)
3. Verificar redimensionamento (900px)

### Problema: Bolhas não detectadas após correção
**Verificação**:
1. Verificar se perspectiva foi corrigida
2. Verificar resolução da imagem corrigida (1240x1754)
3. Verificar limites de detecção de bolhas

---

## Relatório de Teste

Use este template para documentar testes:

```
Data: [DATA]
Ambiente: [DESCIÇÃO]
Método detectado: [ARUCO/HARRIS/EDGES/etc]
Sucesso: [SIM/NÃO]
Tempo: [XXXms]

Condições:
- Iluminação: [natural/artificial/mista/sombras]
- Ângulo câmera: [frontal/~30°/~45°]
- Qualidade impressão: [alta/média/baixa]
- Oclusão: [nenhuma/parcial/significativa]

Observações:
[Notas relevantes]

Logs relevantes:
[Copiar trechos de logs importantes]
```

---

## Éxito dos Testes

Todos os testes devem retornar:
- ✓ 4 cantos detectados
- ✓ Perspectiva corrigida
- ✓ Bolhas detectadas
- ✓ Respostas lidas corretamente

**Taxa de sucesso esperada**: > 90% para a maioria dos cenários
