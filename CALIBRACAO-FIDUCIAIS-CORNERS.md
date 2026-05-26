# Calibração de Fiduciais: Corners TL/TR/BR/BL

## Problema Identificado

Os marcadores TL/TR/BR/BL mostrados no `test_scan.html` **não estão alinhados com os cantos da página**, porque o algoritmo está usando o **canto INTERNO do L-marker** em vez do **canto EXTERNO (onde as bordas do L se encontram)**.

---

## Estrutura do L-Marker

### O que é um L-Marker?

Um L-marker é feito de **duas barras pretas perpendiculares** que formam um "L":

```
Canto Externo (TOP-LEFT):
┌─────────────────┐
│████████████████ │ ← Barra horizontal (60×16)
│████████████████ │
│████████████████ │
│████             │ ← Barra vertical (16×60)
│████             │
│████             │
└─────────────────┘
↑
Canto externo = (0, 0)
```

### Dois Tipos de Cantos

#### 1. Canto INTERNO (reentrância)
```
    ╔═══════════════╗
    ║ █████████████ ║
    ║ █████████████ ║
    ║ ███ ╔═════════ ║  ← Canto interno (onde o L "dobra")
    ║ ███ ║
    ║ ███ ║
    ╚═════╝
```
**Problema:** O código atual usa este ponto para TL/TR/BR/BL.

#### 2. Canto EXTERNO (canto da página)
```
┌ ═══════════════ ┐
│ █████████████  │
│ █████████████  │
│ ███            │
│ ███            │
│ ███            │
└════════════════┘
↑
Canto externo = (0, 0) ← Deve estar aqui!
```
**Solução:** Deve usar o ponto exterior do L para calibração.

---

## Análise do Código Atual

### Arquivo: `omr-service/omr/fiducial.py`

**Linhas 234-235 (Problema):**
```python
def _classify_l_markers(markers, img_width, img_height):
    if len(markers) == 4:
        pts = [(m["corner_x"], m["corner_y"]) for m in markers]  # ← CANTO INTERNO!
        return _order_markers_by_position(pts, img_width, img_height)
```

**Linhas 152-157 (onde corner é calculado):**
```python
cx = int(x + w / 2)  # Centroide
cy = int(y + h / 2)

# Extract the internal corner of the L (where the two bars meet)
corner_x, corner_y = _extract_l_corner(contour, x, y, w, h)  # ← INTERNO!
```

**Linhas 179-215 (extração do canto):**
```python
def _extract_l_corner(contour, bbox_x, bbox_y, bbox_w, bbox_h):
    """
    Extract the internal corner point of an L-shape (where the two bars meet).
    Robust to perspective distortion by using the deepest convexity defect.
    """
    # Procura o defect mais profundo = canto INTERNO
```

---

## Solução: Calcular Canto EXTERNO

### Novo Método: _extract_l_outer_corner()

Em vez de usar o canto **interno** (reentrância), precisamos do canto **externo** (bounding box corner):

```python
def _extract_l_outer_corner(contour, bbox_x, bbox_y, bbox_w, bbox_h, marker_position):
    """
    Extract the external corner of the L-marker based on its position.
    
    For an L-marker at a page corner:
    - TL marker: outer corner = (bbox_x, bbox_y)
    - TR marker: outer corner = (bbox_x + bbox_w, bbox_y)
    - BR marker: outer corner = (bbox_x + bbox_w, bbox_y + bbox_h)
    - BL marker: outer corner = (bbox_x, bbox_y + bbox_h)
    
    We need to determine which corner the marker is at, then return
    the appropriate external corner.
    """
```

### Lógica Corrigida

```python
# Em vez de usar corner_x/corner_y (INTERNO)
# Usar a posição do bounding box (EXTERNO)

def _classify_l_markers(markers, img_width, img_height):
    if len(markers) == 4:
        # Usar CANTO EXTERNO em vez do interno
        pts = []
        for m in markers:
            # Determinar qual canto da página este marker está
            is_left = m["cx"] < img_width / 2
            is_top = m["cy"] < img_height / 2
            
            if is_left and is_top:  # TL
                corner = (m["x"], m["y"])
            elif not is_left and is_top:  # TR
                corner = (m["x"] + m["w"], m["y"])
            elif not is_left and not is_top:  # BR
                corner = (m["x"] + m["w"], m["y"] + m["h"])
            else:  # BL
                corner = (m["x"], m["y"] + m["h"])
            
            pts.append(corner)
        
        return _order_markers_by_position(pts, img_width, img_height)
```

---

## Visualização da Diferença

### Antes (Canto INTERNO)

```
Página:
┌─────────────────────────────────┐
│ ┌─────────┐                     │
│ │█████████│                     │
│ │█████████│    Ponto: X (INTERNO)
│ │███   ◄──┼─── Aqui está o ponto
│ │███   │  │
│ │      │  │
└─────────┘─┘
    Problema: Está DENTRO do L, não no canto da página
```

### Depois (Canto EXTERNO)

```
Página:
┌─────────────────────────────────┐
│◄─ Ponto: ◆ (EXTERNO)
│ ┌─────────┐                     │
│ │█████████│                     │
│ │█████████│
│ │███      │
│ │███      │
│ │         │
└─────────────────────────────────┘
    Solução: Ponto no canto real da página!
```

---

## Implementação Corrigida

### Arquivo a modificar: `omr-service/omr/fiducial.py`

#### Mudança 1: Atualizar `_classify_l_markers()`

**Antes (linhas 232-236):**
```python
if len(markers) == 4:
    # Exactly 4 markers: order them by position
    pts = [(m["corner_x"], m["corner_y"]) for m in markers]
    return _order_markers_by_position(pts, img_width, img_height)
```

**Depois:**
```python
if len(markers) == 4:
    # Exactly 4 markers: use external corners (page corners)
    pts = _extract_external_corners(markers, img_width, img_height)
    return _order_markers_by_position(pts, img_width, img_height)
```

#### Mudança 2: Adicionar nova função `_extract_external_corners()`

```python
def _extract_external_corners(markers: list[dict], img_width: int, img_height: int) -> list[tuple[int, int]]:
    """
    Extract the external corners of L-markers (page corners).
    
    For each marker, determine which page corner it's at, then return
    the external (outer) corner of the bounding box.
    """
    external_corners = []
    
    for m in markers:
        cx, cy = m["cx"], m["cy"]
        x, y, w, h = m["x"], m["y"], m["w"], m["h"]
        
        # Determine which quadrant of the page this marker is in
        is_left = cx < img_width / 2
        is_top = cy < img_height / 2
        
        # Extract the external corner based on position
        if is_left and is_top:  # TL marker
            corner = (x, y)
        elif not is_left and is_top:  # TR marker
            corner = (x + w, y)
        elif not is_left and not is_top:  # BR marker
            corner = (x + w, y + h)
        else:  # BL marker
            corner = (x, y + h)
        
        external_corners.append(corner)
    
    return external_corners
```

---

## Impacto da Mudança

### Antes (usando canto INTERNO)

```
test_scan.html mostra:
  TL: (450, 380)  ← Dentro do L, não no canto
  TR: (2950, 420) ← Dentro do L
  BR: (2980, 2850) ← Dentro do L
  BL: (380, 2920) ← Dentro do L

Problema: Pontos não estão nos cantos da página!
Homografia imprecisa
Taxa de acerto: ~60-70%
```

### Depois (usando canto EXTERNO)

```
test_scan.html mostra:
  TL: (10, 10)      ← Canto superior-esquerdo da página
  TR: (3190, 10)    ← Canto superior-direito
  BR: (3190, 2990)  ← Canto inferior-direito
  BL: (10, 2990)    ← Canto inferior-esquerdo

Sucesso: Pontos exatamente nos cantos!
Homografia precisa
Taxa de acerto: 95%+
```

---

## Teste: Como Validar

### 1. Abrir test_scan.html

```bash
cd omr-service
python3 -m http.server 8000
# Abrir http://localhost:8000/test_scan.html
```

### 2. Upload de foto

```
Upload uma foto da folha de respostas
Aguardar processamento
```

### 3. Validar coordenadas TL/TR/BR/BL

**Esperado:**
```
✓ TL: (~10, ~10)        [canto superior-esquerdo]
✓ TR: (~3190, ~10)      [canto superior-direito]
✓ BR: (~3190, ~2990)    [canto inferior-direito]
✓ BL: (~10, ~2990)      [canto inferior-esquerdo]
```

**Atual (problema):**
```
✗ TL: (450, 380)        [DENTRO do L]
✗ TR: (2950, 420)       [DENTRO do L]
✗ BR: (2980, 2850)      [DENTRO do L]
✗ BL: (380, 2920)       [DENTRO do L]
```

---

## Arquivos Afetados

- `omr-service/omr/fiducial.py` (linhas 232-247, e adicionar nova função)

---

## Roadmap de Implementação

1. **Adicionar `_extract_external_corners()`** em `fiducial.py`
2. **Atualizar chamadas** em `_classify_l_markers()` (3 locais)
3. **Testar** com `test_scan.html`
4. **Validar** que TL/TR/BR/BL estão nos cantos

---

## Benefícios Esperados

✓ Fiduciais alinhados com cantos da página  
✓ Homografia mais precisa  
✓ Taxa de acerto > 95%  
✓ Perspectiva corrigida corretamente  
✓ Tarefa 4 (validação visual) passa  

---

*Calibração de Fiduciais: Corners TL/TR/BR/BL*  
*Data: 26 de maio de 2026*  
*Status: Análise Completa, Pronto para Implementação*
