# Guia Prático: Testar o Novo Layout

## O Que Mudou

Os marcadores L foram reposicionados para melhorar a leitura:

```
ANTES: [L] junto ao QR (8mm do topo, 1mm da borda)
DEPOIS: [L] bem abaixo do QR (55mm do topo, 12mm da borda)
```

## Passo 1: Gerar Novo PDF

### Via Interface Web
1. Acesse a aplicação (ex: `http://localhost:5173`)
2. Vá para **Criar Avaliação** ou **Gerar PDFs**
3. Configure as questões normalmente
4. Clique em **"Gerar Folha de Respostas"**
5. Baixe o PDF

### O PDF Gerado Deve Mostrar:
- ✓ Título "FOLHA DE RESPOSTAS" no topo
- ✓ QR code no canto superior direito
- ✓ **20mm de espaço vazio** (antes dos L's)
- ✓ Dois L's pretos (um superior esquerdo, um superior direito) **bem afastados do QR**
- ✓ Bolhas de resposta numeradas
- ✓ Dois L's pretos na parte inferior

## Passo 2: Teste Visual

### Verificação Rápida (sem câmera)

Imprima o PDF e:
1. **Meça o espaço vertical:**
   - Do topo do QR até o L superior = deve ser ~20mm
   
2. **Meça o espaço horizontal:**
   - L esquerdo até borda esquerda = deve ser ~12mm
   - L direito até borda direita = deve ser ~12mm

3. **Visualmente confirme:**
   - L superior esquerdo **NÃO toca** o QR code
   - L superior direito **NÃO toca** o QR code
   - Há espaço claro entre os dois

## Passo 3: Teste com Câmera (Recomendado)

### Setup

**Terminal 1** - Iniciar OMR Service:
```bash
cd omr-service
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2** - Servidor HTTP:
```bash
python3 -m http.server 3000
```

**Browser:**
```
http://localhost:3000/omr-service/test_scan.html
```

### Procedimento de Teste

1. **Imprima** o novo PDF (ou exiba na tela)
2. **Abra** `test_scan.html` no navegador
3. **Clique** em "Selecionar Imagem" ou use câmera
4. **Fotografe** o PDF em diferentes ângulos:
   - Ângulo reto (0°) - controle
   - Ângulo moderado (30°)
   - Ângulo severo (45°-60°)

### O Que Esperar

#### Resultado Bom ✓
- Página debug mostra **4 pontos verdes** (L-markers detectados)
- Pontos estão **bem distribuídos** nas 4 quinas
- QR code está **legível** (verde)
- Bolhas estão **alinhadas** e **bem visíveis**
- Imagem corrigida mostra layout **reto e centralizado**

#### Resultado Ruim ❌
- Menos de 4 L-markers detectados
- L-markers em posição estranha
- Bolhas distorcidas demais após correção
- QR code ilegível

## Passo 4: Comparação Antes vs Depois

### Se Tiver Imagens Antigas

**Compare usando:**

```bash
# Ver imagens de debug lado a lado
# Pasta do browser: Developer Tools > Network > buscar respostas com "debug_image"
```

### Métricas a Comparar

| Métrica | Antes | Depois |
|---------|-------|--------|
| L-markers detectados | Sim (mas distorcido) | Sim (alinhado) |
| Bolhas visíveis após correção | Parcial | Total |
| Erro de perspectiva | Alto | Baixo |
| Qualidade em ângulo | Ruim | Boa |

## Troubleshooting

### Problema: L-markers não detectados

**Causa possível:** PDF antigo sendo usado

**Solução:**
1. Limpe cache do navegador (Ctrl+Shift+Delete)
2. Gere novo PDF
3. Teste novamente

### Problema: Serviço OMR não conecta

**Verificar:**
```bash
# Check if service is running
curl http://localhost:8000/api/health

# Check logs
tail -20 /tmp/omr.log
```

### Problema: QR code não lê

**Verificar:**
1. QR code está com boa resolução
2. Não está em ângulo extremo (>60°)
3. Iluminação adequada

## Documentação Completa

Para entender melhor as mudanças:
- `FINAL-CHANGES-SUMMARY.md` - O que mudou e por quê
- `LAYOUT-COMPARISON.md` - Visualização antes/depois
- `TEMPLATE-REDESIGN.md` - Análise técnica

## Próximas Etapas

✅ Gerar PDF com novo layout  
✅ Testar visualmente  
✅ Testar com câmera/OMR  
✅ Validar em múltiplos ângulos  
➜ **Implementar em produção** (quando validado)
