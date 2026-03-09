# 🚀 Guia de Deploy Rápido

## ⚡ Método Mais Rápido (Railway - 5 minutos)

### Passo 1: Deploy no Railway

1. Acesse: https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Escolha seu repositório
6. Aguarde o deploy inicial (~2 minutos)

### Passo 2: Configurar Root Directory

1. No painel do Railway, clique no serviço criado
2. Vá em **Settings** → **Service**
3. Em **Root Directory**, digite: `server`
4. Clique em "Save"
5. Railway fará redeploy automático (~2 minutos)

### Passo 3: Gerar URL Pública

1. Ainda em Settings, vá para **Networking**
2. Clique em "Generate Domain"
3. Copie a URL gerada (ex: `https://seu-app.up.railway.app`)

### Passo 4: Atualizar Frontend

Abra o arquivo `src/hooks/useDashboard.ts` e encontre a linha 266:

```javascript
const serverUrls = [
  'https://SEU-APP-AQUI.up.railway.app/api/generate-pdf',  // Cole sua URL aqui
  'https://avaliacao-pdf-server.railway.app/api/generate-pdf',
  'http://localhost:3001/api/generate-pdf',
]
```

Substitua `SEU-APP-AQUI.up.railway.app` pela URL que você copiou.

### Passo 5: Testar

1. Faça commit das alterações
2. Aguarde o deploy do frontend
3. Teste gerando uma avaliação em PDF
4. ✅ **Funcionando!**

---

## 🐳 Método Alternativo (Render com Docker - 15 minutos)

### Quando usar Render?

Use Render se:
- Railway não funcionou
- Você quer usar Docker
- Precisa de mais controle sobre o ambiente

### Passo 1: Deploy no Render

1. Acesse: https://render.com
2. Faça login com GitHub
3. Clique em "New +" → "Web Service"
4. Conecte seu repositório
5. Configure:
   - **Name**: `avaliacao-pdf-server`
   - **Root Directory**: `server`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free`
6. Clique em "Create Web Service"
7. Aguarde o deploy (~10-15 minutos na primeira vez)

### Passo 2: Obter URL

1. Após o deploy, copie a URL do serviço
2. Teste acessando: `https://sua-url.onrender.com/api/health`
3. Deve retornar: `{"status":"OK",...}`

### Passo 3: Atualizar Frontend

Mesma coisa do Railway, mas usando a URL do Render.

---

## 🔍 Verificação de Funcionamento

### 1. Testar Health Check

Abra no navegador:
```
https://sua-url.up.railway.app/api/health
```

Deve retornar:
```json
{
  "status": "OK",
  "message": "Servidor Puppeteer funcionando!",
  "timestamp": "2024-..."
}
```

### 2. Verificar Logs

**Railway:**
- Vá em "Deployments"
- Clique no último deploy
- Veja os logs em tempo real

**Render:**
- Vá em "Logs"
- Verifique se não há erros

### 3. Testar Geração de PDF

1. Faça login no sistema
2. Crie uma avaliação
3. Clique em "Gerar PDF"
4. O PDF deve ser baixado automaticamente

---

## ❌ Solução de Problemas

### "Não foi possível conectar com nenhum servidor"

**Causas possíveis:**
1. ❌ Servidor não foi deployado corretamente
2. ❌ URL incorreta no código
3. ❌ Root Directory não configurado (Railway)
4. ❌ Servidor está hibernando (Render)

**Soluções:**
1. ✅ Verifique o health check: `https://sua-url/api/health`
2. ✅ Confirme a URL no código
3. ✅ No Railway, configure Root Directory = `server`
4. ✅ No Render, aguarde 60s na primeira requisição

### Deploy falhou no Render

**Causa:** Erro no build do Docker

**Solução:**
1. Verifique os logs do build
2. Confirme que o Dockerfile existe em `/server/Dockerfile`
3. Tente o Railway ao invés do Render

### Railway não gera URL

**Solução:**
1. Vá em Settings → Networking
2. Clique em "Generate Domain"
3. Aguarde alguns segundos

### PDF não é gerado

**Causas:**
1. ❌ Servidor não está rodando
2. ❌ Erro no Puppeteer
3. ❌ Timeout muito curto

**Soluções:**
1. ✅ Verifique os logs do servidor
2. ✅ Rode `npm run check` localmente para testar
3. ✅ Aguarde mais tempo (primeira geração pode demorar)

---

## 📊 Comparação de Plataformas

| Feature | Railway | Render (Docker) |
|---------|---------|-----------------|
| Facilidade | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Tempo de deploy | 2-5 min | 10-15 min |
| Hibernação | Não* | Sim (15 min) |
| Primeira req. | ~3s | ~60s |
| Suporte Puppeteer | Nativo | Via Docker |
| Logs | Excelentes | Bons |
| Custo (free tier) | 500h/mês | 750h/mês |

*Railway: 500h grátis = ~16h online por dia

---

## 💡 Dicas Finais

1. **Use Railway primeiro** - É mais fácil e rápido
2. **Teste localmente** - Antes de fazer deploy, teste com `npm start`
3. **Verifique logs** - Sempre que algo der errado
4. **Mantenha atualizado** - Push no GitHub atualiza automaticamente
5. **Aguarde paciência** - Primeira requisição pode demorar

---

## 🎉 Pronto!

Seu servidor de PDF está online e funcionando!

Se precisar de ajuda, consulte o README.md principal ou abra uma issue no GitHub.
