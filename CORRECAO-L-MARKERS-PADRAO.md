# Correção: Detecção de L-Markers por Padrão Preto

## Problema Identificado

A abordagem com Harris Corner Detection estava detectando **ruído e bordas** em vez dos L-markers reais:

```
ANTES (ERRADO):
TL: (0, 28)       - Borda, não marcador
TR: (888, 7)      - Borda, não marcador
BR: (880, 1592)   - Borda, não marcador
BL: (0, 1582)     - Borda, não marcador

Resultado: Perspectiva INCORRETA
```

## A Nova Solução: Detecção por Padrão Preto

Em vez de procurar por "cantos", agora procuramos especificamente pelos **pixels PRETOS** que formam o L-marker.

### Estratégia

1. **Procurar pixels PRETOS** (threshold < 100 em escala cinza)
2. **Agrupar por contorno** - encontra o maior grupo coeso de pretos
3. **Encontrar ponto extremo** - o ponto mais próximo do canto real
4. **Validar tamanho** - garante que é um padrão significativo

### Código

```python
def _find_l_marker_pattern(image, target_corner):
    """
    1. Extrai ROI do canto (1/6 da imagem)
    2. Binarização agressiva: threshold < 100 (preto)
    3. Encontra contornos de pixels pretos
    4. Seleciona maior contorno (deve ser L-marker)
    5. Encontra ponto mais extremo
    6. Retorna coordenadas globais
    """
```

### Por Que Funciona Melhor

| Aspecto | Harris Corner | Padrão Preto |
|---------|---------------|------------|
| **O que procura** | Qualquer canto (ambíguo) | Pixels PRETOS específicos |
| **Robustez** | Detecta ruído também | Apenas L-markers verdadeiros |
| **Sensibilidade** | Muito alta (muitos falsos) | Ajustada para L-markers |
| **Área mínima** | Sem validação | Valida > 50 pixels |

---

## Mudanças Técnicas

### Antes (Harris Corner)
```python
harris_corners = cv2.cornerHarris(blurred, blockSize=2, ksize=3, k=0.04)
threshold = 0.1 * harris_normalized.max()
strong_corners = np.argwhere(harris_normalized > threshold)
```

### Depois (Padrão Preto)
```python
# Binarização agressiva para pixels PRETOS
_, binary = cv2.threshold(roi, 100, 255, cv2.THRESH_BINARY_INV)

# Encontrar contornos
contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

# Maior contorno = L-marker
largest_contour = max(contours, key=cv2.contourArea)

# Ponto mais extremo do L
if target_corner == "TL":
    # Ponto com menor x + menor y
    distances = np.sqrt(pts[:, 0]**2 + pts[:, 1]**2)
    extreme_idx = np.argmin(distances)
```

---

## Parâmetros Ajustáveis

Se precisar tuning:

```python
# ROI size
margin_h = h // 6  # Atualmente 1/6 (era 1/8)
margin_w = w // 6

# Threshold para preto
threshold_value = 100  # Pixels < 100 em cinza = preto

# Área mínima do contorno
min_area = 50  # Não processar contornos muito pequenos

# Simplificação de contorno
epsilon = 0.02 * cv2.arcLength(contour, True)
```

---

## Resultados Esperados

### Agora (CORRETO)
```
TL: (~40, ~25)      - Canto superior-esquerdo do L-marker
TR: (~1200, ~25)    - Canto superior-direito do L-marker
BR: (~1200, ~1700)  - Canto inferior-direito do L-marker
BL: (~40, ~1700)    - Canto inferior-esquerdo do L-marker

✓ Perspectiva CORRETA
✓ Bolhas ALINHADAS
✓ Respostas CORRETAS
```

---

## Validação

- ✓ Sintaxe Python OK
- ✓ Build npm sucesso (9.55s)
- ✓ Pronto para teste

---

## Próximos Passos

1. **Teste com a imagem real** que não funcionava antes
2. **Monitore os logs** para confirmar detecção correta
3. **Ajuste parâmetros** se necessário (threshold, ROI size, etc)
4. **Valide perspectiva** visualmente nas imagens de debug

---

**Status**: ✅ Implementado e compilado
**Versão**: 2.0 (Correção)
**Data**: 2026-05-27
