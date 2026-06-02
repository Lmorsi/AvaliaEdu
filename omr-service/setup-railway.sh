#!/bin/bash
# Comandos Prontos para Copiar e Colar
# Use esse script para fazer setup em 1 minuto

echo "╔════════════════════════════════════════════╗"
echo "║  SETUP RÁPIDO - Passos 1 e 2 do Railway   ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Mudar para diretório omr-service
cd omr-service || exit

echo "📁 Entrando em omr-service..."
echo ""

# 1. Criar ambiente virtual
echo "1️⃣  Criando ambiente virtual..."
python -m venv venv
echo "   ✅ Feito"
echo ""

# 2. Ativar ambiente virtual
echo "2️⃣  Ativando ambiente virtual..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # Linux/Mac
    source venv/bin/activate
fi
echo "   ✅ Feito"
echo ""

# 3. Atualizar pip
echo "3️⃣  Atualizando pip..."
pip install --upgrade pip
echo "   ✅ Feito"
echo ""

# 4. Instalar dependências
echo "4️⃣  Instalando dependências (isso pode levar 1-2 minutos)..."
pip install -r requirements.txt
echo "   ✅ Feito"
echo ""

# 5. Criar .env
echo "5️⃣  Criando arquivo .env..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   ✅ Arquivo .env criado"
else
    echo "   ⚠️  Arquivo .env já existe (usando existente)"
fi
echo ""

# 6. Testar servidor
echo "6️⃣  Testando servidor..."
echo "   Abrindo em background..."
python main.py &
SERVER_PID=$!
sleep 2

# Verificar se servidor iniciou
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "   ✅ Servidor respondendo em http://localhost:8000"
else
    echo "   ⚠️  Servidor pode estar iniciando..."
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║          🎉 SETUP CONCLUÍDO!              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Parar o servidor (Ctrl+C no terminal)"
echo ""
echo "2. Rodar servidor em foreground:"
echo "   python main.py"
echo ""
echo "3. Acessar documentação interativa:"
echo "   http://localhost:8000/docs"
echo ""
echo "4. Testar health check:"
echo "   curl http://localhost:8000/api/health"
echo ""
echo "5. Fazer commit:"
echo "   git add ."
echo "   git commit -m 'Setup: Railway deployment files'"
echo "   git push origin main"
echo ""
