# Análise: Distorção de Perspectiva na Leitura de Cartões

## Problema Observado

Na imagem anexada, o cartão está com distorção severa (câmera em ângulo extremo):
- QR code está legível no topo direito
- Marcadores L (verde/amarelo/vermelho) foram detectados
- Mas a homografia resultante está incorreta
- Bolhas de resposta ficam desalinhadas após correção de perspectiva

## Causa Raiz

1. **Marcadores no topo e embaixo**: Estão muito separados verticalmente
2. **Ângulo de câmera severo**: Faz com que a perspectiva seja não-linear nas extremidades
3. **Detecção de cantos imprecisa**: Em distorção severa, o ponto interno do L fica difícil de localizar com precisão

## Soluções Implementadas (v1)

### 1. Melhorado Extração de Cantos
- Agora usa defect de convexidade para encontrar o canto interno
- Mais robusto a perspectiva severa

### 2. Melhorado Algoritmo de Classificação
- Usa convex hull (OpenCV) para selecionar os 4 melhores marcadores
- Ordem baseada na distância aos cantos esperados (TL, TR, BR, BL)
- Funciona melhor com ≥4 marcadores

## Sua Sugestão: Reposicionar Marcadores

**Colocar marcadores L abaixo do QR code teria vantagens:**

### Prós:
- Marcadores mais próximos do conteúdo (bolhas de resposta)
- Menos afetados por distorção do topo da página
- QR code fica fora da zona de perspectiva crítica
- Melhor para detecção de bolhas após correção

### Contras:
- Requer redesenho do template PDF
- Mudar layout do cartão (quebra compatibilidade com folhas antigas)

## Recomendação

Para resolver completamente sem mudar o template:

### Opção 1: Algoritmo de Homografia Adaptativo (RECOMENDADO)
Implementar ransac-based homography que:
1. Detecta outliers entre os 4 marcadores
2. Ajusta a transformação iterativamente
3. Prioriza a zona central (onde estão as bolhas)

### Opção 2: Detectar Apenas Bolhas (sem fiduciais)
- Usar rede neural ou padrão esperado das bolhas
- Menos dependente de marcadores de canto
- Requer mais dados de treinamento

### Opção 3: Reposicionar Marcadores
Se compatibilidade com novo padrão não é problema:
- Mover marcadores L para **30% e 70% da altura** (mais próximos ao conteúdo)
- Mantém QR code fora da zona de distorção
- Melhora significativa na precisão

## Status Atual

O serviço OMR agora:
- ✓ Detecta L-markers com maior precisão
- ✓ Classifica 4+ marcadores melhor
- ✓ Funciona com perspectiva moderada
- ⚠ Perspectiva severa ainda precisa de RANSAC

## Próximos Passos

1. **Testar com mais amostras** de diferentes ângulos
2. **Implementar RANSAC** se muitos cartões ainda falharem
3. **Considerar reposicionar marcadores** se RANSAC for insuficiente

## Arquivo afetado
- `omr-service/omr/fiducial.py` (melhorias v1)
