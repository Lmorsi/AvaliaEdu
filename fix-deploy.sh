#!/bin/bash

# Script para resolver conflito de merge e fazer deploy

echo "Verificando se é um repositório Git..."
if [ ! -d .git ]; then
  echo "ERRO: Este não é um repositório Git."
  echo ""
  echo "SOLUÇÃO MANUAL:"
  echo "1. Acesse seu repositório no GitHub"
  echo "2. Navegue até: src/components/sections/ScanAssessmentsSection.tsx"
  echo "3. Clique em 'Edit' (ícone de lápis)"
  echo "4. Procure e DELETE as seguintes linhas:"
  echo "   <<<<<<< HEAD"
  echo "   ======="
  echo "   >>>>>>> (qualquer texto)"
  echo "5. Salve o commit"
  echo "6. O deploy do Vercel deve funcionar automaticamente"
  exit 1
fi

echo "Verificando branch atual..."
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

echo ""
echo "Adicionando arquivo corrigido..."
git add src/components/sections/ScanAssessmentsSection.tsx

echo "Criando commit..."
git commit -m "Fix: Remove merge conflict markers from ScanAssessmentsSection"

echo ""
echo "Para enviar ao GitHub, execute:"
echo "git push origin $BRANCH"
echo ""
echo "Ou, se necessário forçar:"
echo "git push origin $BRANCH --force"
