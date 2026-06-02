#!/bin/bash

# Script para testar o servidor OMR localmente

echo "================================"
echo "Teste do Servidor OMR"
echo "================================"
echo ""

# Verificar se servidor está rodando
echo "1. Testando health check..."
HEALTH=$(curl -s http://localhost:8000/api/health)

if [ -z "$HEALTH" ]; then
    echo "❌ Servidor não está respondendo!"
    echo "   Inicie com: python main.py"
    exit 1
fi

echo "✅ Servidor respondendo"
echo "   Resposta: $HEALTH"
echo ""

# Testar com uma imagem de teste
echo "2. Procurando arquivo de teste..."
if [ ! -f "test_bubbles.html" ]; then
    echo "⚠️  Arquivo test_bubbles.html não encontrado"
    echo "   Você pode criar uma imagem de teste e fazer POST em:"
    echo "   curl -X POST -F 'photo=@image.jpg' http://localhost:8000/api/omr/scan"
else
    echo "✅ Arquivo test_bubbles.html encontrado"
fi

echo ""
echo "================================"
echo "Documentação de Endpoints"
echo "================================"
echo ""
echo "Health Check:"
echo "  GET http://localhost:8000/api/health"
echo ""
echo "Processar Gabarito:"
echo "  POST http://localhost:8000/api/omr/scan"
echo "  Parâmetro: photo (arquivo JPEG/PNG)"
echo "  Parâmetro: debug=true (opcional)"
echo ""
echo "Swagger UI:"
echo "  http://localhost:8000/docs"
echo ""
