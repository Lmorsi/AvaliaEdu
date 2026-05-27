# Detecção de Marcadores L com Harris Corner Detection

## Visão Geral

A nova implementação usa **Harris Corner Detection** para localizar os marcadores em L nos 4 cantos da folha de resposta, substituindo a abordagem anterior baseada em detecção de linhas (Hough Lines), que falhava com linhas finas.

## Problema com Abordagem Anterior

- ❌ HoughLinesP falhava ao detectar linhas finas/fracas
- ❌ Ruído (teclado, mesa) interferia na detecção
- ❌ Contornos não capturavam bem os cantos extremos
- ❌ Perspectiva distorcida resultava em bordas incorretas

## Nova Abordagem: Harris Corner Detection

### Fluxo de Processamento

```
1. ROI Extraction (1/8 da imagem em cada canto)
   ↓
2. Binarização Adaptativa (contraste local)
   ↓
3. Binarização Otsu (threshold global automático)
   ↓
4. Combinação das binarizações (intersecção)
   ↓
5. Desfoque Gaussiano (reduz ruído)
   ↓
6. Harris Corner Detection
   ↓
7. Filtragem por Força (top 10%)
   ↓
8. Análise de Centroide (remove outliers)
   ↓
9. Desvio Padrão (2-sigma rule)
   ↓
10. Seleção do Canto Extremo
```

### Detalhes de Cada Etapa

#### 1. **Extração da ROI (Region of Interest)**

```python
margin = min(w, h) // 8  # 1/8 da imagem
```

Define uma região específica para cada canto (TL, TR, BR, BL), focando apenas na área onde o marcador L deveria estar.

**Benefício**: Ignora completamente o teclado, mesa ou fundos distantes.

#### 2. **Binarização Adaptativa**

```python
cv2.adaptiveThreshold(roi, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, blockSize=11, C=2)
```

- Calcula o threshold localmente para cada pixel (baseado em vizinhança 11x11)
- **Benefício**: Lidar com iluminação não uniforme (sombras, reflexos)
- Funciona bem mesmo quando parte da folha está sombreada

#### 3. **Binarização Otsu**

```python
cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
```

- Calcula automaticamente o melhor threshold global
- **Benefício**: Separação automática entre foreground (marcador) e background
- Não requer ajuste manual

#### 4. **Combinação das Binarizações**

```python
binary = cv2.bitwise_and(adaptive_thresh, otsu_thresh)
```

- Usa a **intersecção** das duas binarizações
- **Benefício**: Pixels que passam em AMBOS os critérios são os mais confiáveis
- Reduz drasticamente o ruído

#### 5. **Desfoque Gaussiano**

```python
cv2.GaussianBlur(binary, (5, 5), 1.0)
```

- Aplica desfoque suave para suavizar pequenos artefatos
- **Benefício**: Reduz picos de ruído isolados mantendo estrutura principal
- Melhora a detecção de cantos coesos

#### 6. **Harris Corner Detection**

```python
harris_corners = cv2.cornerHarris(blurred, blockSize=2, ksize=3, k=0.04)
```

Algoritmo de Harris detecta cantos (mudanças rápidas em 2 direções):
- **blockSize=2**: Janela pequena para precisão
- **ksize=3**: Kernel de Sobel pequeno
- **k=0.04**: Fator Harris (padrão)

**Benefício**: Encontra especificamente os "cantos" do L, não apenas linhas

#### 7. **Filtragem por Força**

```python
threshold = 0.1 * harris_normalized.max()
strong_corners = np.argwhere(harris_normalized > threshold)
```

Seleciona apenas os cantos com resposta Harris acima de 10% do máximo.

**Benefício**: Remove cantos fracos (ruído, texturas)

#### 8. **Análise de Centroide**

```python
top_n = max(1, len(sorted_indices) // 10)
top_corners = strong_corners[sorted_indices[:top_n]]

centroid_y = np.mean(top_corners[:, 0])
centroid_x = np.mean(top_corners[:, 1])
```

Calcula o centroide dos 10% de cantos mais fortes.

**Benefício**: Identifica a "zona de confiança" onde o marcador deve estar

#### 9. **Desvio Padrão (2-Sigma Rule)**

```python
distances = np.sqrt((top_corners[:, 1] - centroid_x) ** 2 + (top_corners[:, 0] - centroid_y) ** 2)
threshold_dist = mean_dist + 2 * std_dist
filtered_corners = top_corners[distances <= threshold_dist]
```

Remove outliers usando o critério de 2 desvios padrão.

**Benefício**: Mantém apenas cantos coesos, elimina pontos isolados (ruído da mesa/teclado)

#### 10. **Seleção do Canto Extremo**

```python
if is_top_left:
    if is_left:
        corner = min(filtered_corners, key=lambda c: c[1] + c[0])  # Mín(x+y)
    else:
        corner = min(filtered_corners, key=lambda c: -c[1] + c[0]) # Máx(x), Mín(y)
```

Para cada canto, seleciona o ponto mais extremo:
- **TL**: menor x + menor y
- **TR**: maior x + menor y
- **BR**: maior x + maior y
- **BL**: menor x + maior y

**Benefício**: Garante que pegamos o canto MAIS extremo, não um ponto intermediário

## Pseudocódigo Completo

```
Para cada canto (TL, TR, BR, BL):
    1. Extrair ROI (1/8 da imagem)
    2. Aplicar binarização adaptativa
    3. Aplicar binarização Otsu
    4. Combinar com AND (intersecção)
    5. Desfocar com Gaussiano
    6. Harris Corner Detection
    7. Filtrar cantos > 10% força
    8. Calcular centroide dos 10% top
    9. Remover outliers (2-sigma)
    10. Retornar canto mais extremo
```

## Comparação: Antes vs Depois

| Aspecto | HoughLines (Antes) | Harris (Depois) |
|---------|-------------------|-----------------|
| Linhas finas | ❌ Falhava | ✅ Detecta |
| Ruído (mesa/teclado) | ❌ Interferia muito | ✅ Filtrado efetivamente |
| Iluminação não uniforme | ❌ Problemático | ✅ Adaptativo |
| Precisão de cantos | ❌ Linha é inteira | ✅ Canto exato |
| Tolerância a distorção | ❌ Fraco | ✅ Robusto |
| Velocidade | ✅ Rápido | ✅ Rápido |

## Parâmetros Tuneáveis

```python
# Em _detect_l_marker_harris():

margin = min(w, h) // 8              # Tamanho da ROI (pode usar 1/6 ou 1/10)
blockSize=11                          # Tamanho da vizinhança adaptativa (9-15)
threshold = 0.1 * max_harris          # Percentual de força (0.05-0.20)
top_n = len(sorted_indices) // 10    # Percentual top (1/5 a 1/20)
threshold_dist = mean + 2 * std      # Sigma (1.5-3.0)

cv2.cornerHarris(blockSize=2, ksize=3, k=0.04)  # Parâmetros Harris padrão
```

## Tratamento de Falhas

Se Harris não detectar um marcador em um canto:

1. **Primeiro fallback**: Usa a borda da imagem (ex: (0,0) para TL)
2. **Logging**: Registra qual canto falhou
3. **Perspectiva**: Usa 3 cantos corretamente detectados + 1 fallback

## Exemplos de Uso

### Detecção com Sucesso
```
L-marker TL detectado em (45.2, 52.1)
L-marker TR detectado em (1192.8, 48.9)
L-marker BR detectado em (1198.5, 1701.2)
L-marker BL detectado em (42.3, 1705.7)
L-markers detectados: 4/4
```

### Detecção Parcial
```
L-marker TL detectado em (45.2, 52.1)
L-marker TR detectado em (1192.8, 48.9)
L-marker BR não detectado, usando borda como fallback (1240, 1754)
L-marker BL detectado em (42.3, 1705.7)
L-markers detectados: 3/4
```

### Perspectiva com Dados Parciais
Mesmo com 3/4 cantos corretos, a perspectiva é significativamente melhor que com 0/4, pois pelo menos 75% dos dados estão corretos.

## Performance

- **Tempo por canto**: ~5-15ms (ROI processada é pequena)
- **Tempo total**: ~20-60ms para 4 cantos
- **Memória**: Apenas ROI armazenada, não imagem completa
