# Sistema de Captura de Cartão Resposta

## Funcionalidades Implementadas

### 1. Orientação Horizontal Forçada
- A câmera está configurada para capturar em modo paisagem (landscape)
- Proporção 16:9 otimizada para cartões resposta
- Resolução máxima de 1920x1080 para melhor qualidade

### 2. Guias Visuais de Enquadramento
- **Cantos demarcados**: Quatro cantos com bordas brancas indicam a área de captura ideal
- **Linhas de grade**: Grid de terços para facilitar o posicionamento
- **Indicador central**: Círculo que fica verde quando o QR Code é detectado

### 3. Detecção e Captura Automática

#### Sistema de Detecção
- Detecta automaticamente o QR Code do cartão resposta
- Calcula score de alinhamento em tempo real (0-100%)
- Avalia:
  - Centralização do QR Code
  - Distância do centro da tela
  - Tamanho adequado do QR Code (deve ocupar ~20% da largura)

#### Barra de Alinhamento
- **Verde (80-100%)**: Perfeitamente alinhado
- **Amarelo (60-79%)**: Ajuste necessário
- **Vermelho (0-59%)**: Precisa centralizar

#### Captura Automática
- Quando o alinhamento atinge **80% ou mais**:
  - Inicia contagem regressiva de 3 segundos
  - Números grandes aparecem na tela
  - Captura automaticamente ao final
- Se o alinhamento cair abaixo de 70%, cancela a contagem

### 4. Recursos Adicionais

#### Controles
- **Botão X**: Fecha a câmera e retorna
- **Botão Girar**: Alterna entre câmera traseira/frontal
- **Botão Câmera**: Captura manual a qualquer momento

#### Feedback Visual
- Mensagens contextuais baseadas no estado:
  - "Posicione o cartão resposta no enquadramento"
  - "QR Code Detectado!"
  - "Perfeito! Capturando..."
  - "Ajuste um pouco mais"
  - "Centralize o cartão"

#### Interface
- Tela cheia com fundo preto
- Gradientes nas bordas para melhor legibilidade
- Instruções claras no topo da tela
- Barra de progresso de alinhamento

## Como Usar

1. **Abra a seção "Escanear e Corrigir Provas"**
2. **Digite o nome do aluno**
3. **Clique em "Capturar com Câmera"**
4. **Posicione o dispositivo na horizontal**
5. **Enquadre o cartão resposta usando as guias**
6. **Aguarde a detecção automática (score 80%+)**
7. **A foto será capturada automaticamente após 3 segundos**
8. **Ou toque no botão da câmera para captura manual**

## Requisitos Técnicos

- Navegador com suporte a `getUserMedia` API
- Permissão de acesso à câmera
- Dispositivo com câmera funcional
- JavaScript habilitado

## Resolução de Problemas

### Câmera não inicia
- Verifique se concedeu permissão de câmera
- Recarregue a página e tente novamente
- Verifique se outro app está usando a câmera

### QR Code não é detectado
- Certifique-se que o QR Code está visível
- Aumente a iluminação ambiente
- Aproxime ou afaste o cartão
- Mantenha o cartão paralelo à tela

### Captura automática não funciona
- Verifique o score de alinhamento
- Centralize melhor o QR Code
- Ajuste a distância do cartão
- Use a captura manual se necessário

## Vantagens do Sistema

1. **Precisão**: Captura apenas quando bem alinhado
2. **Facilidade**: Não precisa tocar em botões
3. **Feedback**: Sabe exatamente como ajustar
4. **Flexibilidade**: Captura manual disponível
5. **Qualidade**: Alta resolução e orientação correta
