# 🚀 Servidor PDF com Puppeteer - Layout CSS Simplificado

## 📋 O que é este servidor?

Este servidor converte suas avaliações em PDFs de alta qualidade usando Puppeteer (Chrome headless) com layout 100% CSS. Simplificado e otimizado para máxima performance.

## 🎯 Nova Arquitetura Simplificada

- **Layout 100% CSS**: Usa `column-count` do CSS para distribuição automática
- **Sem cálculos JavaScript**: O navegador faz toda a distribuição das questões
- **Performance otimizada**: Código mais simples e rápido
- **Compatibilidade total**: Funciona perfeitamente com Puppeteer/Chrome

## 🛠️ Instalação Local (Desenvolvimento)

### 1. Instalar dependências
```bash
cd server
npm install
```

**IMPORTANTE:** Se você receber erro sobre Chrome não encontrado, execute:
```bash
npx puppeteer browsers install chrome
```

### 2. Iniciar o servidor
```bash
npm start
```

### 3. Testar se está funcionando
Abra no navegador: http://localhost:3001/api/health

Você deve ver: `{"status":"OK","message":"Servidor Puppeteer funcionando!"}`

## 🌐 Deploy Gratuito (Produção)

### 🤔 Qual plataforma escolher?

| Plataforma | Dificuldade | Tempo de Deploy | Hibernação | Recomendação |
|------------|-------------|-----------------|------------|--------------|
| **Railway** | ⭐ Fácil | 2-5 min | Não* | ✅ **MELHOR OPÇÃO** |
| **Render (Docker)** | ⭐⭐ Médio | 10-15 min | Sim (15 min) | Segunda opção |
| **Heroku** | ⭐⭐⭐ Difícil | 5-10 min | Sim | Requer cartão |

*Railway: 500h gratuitas/mês = ~16h/dia online

**Recomendação**: Use o **Railway** para começar. É o mais fácil e o Puppeteer funciona perfeitamente!

---

### ⚡ INÍCIO RÁPIDO (Railway - 5 minutos)

1. Acesse [railway.app](https://railway.app)
2. Login com GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Selecione o repositório
5. Settings → Service → Root Directory: `server`
6. Settings → Networking → "Generate Domain"
7. Copie a URL e cole em `src/hooks/useDashboard.ts`
8. **Pronto!** 🎉

---

### Opção 1: Render.com com Docker (Alternativa mais estável)

1. **Criar conta**: Acesse [render.com](https://render.com) e faça login com GitHub
2. **Novo Web Service**: Clique em "New +" → "Web Service"
3. **Conectar repositório**: Escolha seu repositório no GitHub
4. **Configurar**:
   - **Name**: `avaliacao-pdf-server`
   - **Region**: Escolha a mais próxima
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free`
5. **Environment Variables** (já configuradas no Dockerfile):
   - `NODE_ENV`: `production`
   - `PUPPETEER_EXECUTABLE_PATH`: `/usr/bin/google-chrome-stable`
6. **Deploy**: Clique em "Create Web Service"
7. **Aguardar**: O primeiro deploy com Docker leva ~10-15 minutos
8. **Obter URL**: Copie a URL gerada (ex: `https://avaliacao-pdf-server.onrender.com`)

**IMPORTANTE**:
- O tier gratuito do Render hiberna após 15 minutos de inatividade
- A primeira requisição após hibernação pode levar 50-60 segundos para acordar
- Use Docker para garantir que o Chrome seja instalado corretamente

### Opção 2: Railway.app (Alternativa MAIS FÁCIL - Puppeteer funciona out-of-the-box!)

**Railway tem suporte nativo para Puppeteer e é MUITO mais fácil!**

1. **Criar conta**: Acesse [railway.app](https://railway.app) e faça login com GitHub
2. **Novo projeto**: Clique em "New Project" → "Deploy from GitHub repo"
3. **Selecionar repositório**: Escolha seu repositório
4. **Configurar automaticamente**: Railway detecta Node.js automaticamente
5. **Adicionar Root Directory**:
   - Vá em Settings → Service
   - Em "Root Directory" coloque: `server`
6. **Deploy**: Railway fará o deploy automaticamente (2-5 minutos)
7. **Obter URL**:
   - Vá em Settings → Networking
   - Clique em "Generate Domain"
   - Copie a URL gerada (ex: `https://seu-app.railway.app`)

**VANTAGENS do Railway**:
- ✅ Puppeteer funciona sem configuração extra
- ✅ Deploy mais rápido (2-5 minutos)
- ✅ Não hiberna (sempre online no tier gratuito por 500h/mês)
- ✅ Melhor performance para aplicações com Puppeteer

### Opção 3: Heroku (Requer cartão de crédito)

1. **Instalar Heroku CLI**: [Download aqui](https://devcenter.heroku.com/articles/heroku-cli)
2. **Login**: `heroku login`
3. **Criar app**: `heroku create seu-app-name`
4. **Configurar buildpacks**:
   ```bash
   heroku buildpacks:add heroku/nodejs
   heroku buildpacks:add jontewks/puppeteer
   ```
5. **Deploy**:
   ```bash
   cd server
   git init
   git add .
   git commit -m "Deploy servidor PDF"
   heroku git:remote -a seu-app-name
   git push heroku main
   ```

### Opção 3: Render.com (Alternativa gratuita)

1. **Criar conta**: [render.com](https://render.com)
2. **Novo Web Service**: Conecte seu repositório GitHub
3. **Configurações**:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Deploy**: Render fará o deploy automaticamente

## ⚙️ Configuração no Frontend

Após fazer o deploy, atualize a URL no arquivo `src/hooks/useDashboard.ts`:

```javascript
const serverUrls = [
  'https://SEU-APP.onrender.com/api/generate-pdf',           // Render (prioridade)
  'https://SEU-APP.railway.app/api/generate-pdf',            // Railway
  'http://localhost:3001/api/generate-pdf',                   // Local
  'https://SEU-APP.herokuapp.com/api/generate-pdf'            // Heroku
]
```

**Substitua `SEU-APP` pela URL real do seu deploy!**

O código atual já está configurado para tentar múltiplos servidores automaticamente. Basta fazer o deploy e o sistema tentará se conectar ao primeiro servidor disponível.

## 🔧 Solução de Problemas

### ❌ "Não foi possível conectar com nenhum servidor"

**Causa**: Servidor não está rodando ou URL incorreta

**Soluções**:
1. **Local**: Execute `cd server && npm start`
2. **Deploy**: Verifique se o deploy foi bem-sucedido
3. **URL**: Confirme se a URL no código está correta

### ❌ "Could not find Chrome" ou erro do Puppeteer

**Causa**: Chrome não está instalado para o Puppeteer

**Soluções**:
1. **Instalar Chrome do Puppeteer**:
   ```bash
   cd server
   npx puppeteer browsers install chrome
   ```

2. **Ou instalar Google Chrome no sistema**:
   - Windows: Baixe do site oficial do Google Chrome
   - Linux: `sudo apt-get install google-chrome-stable`
   - macOS: Baixe do site oficial do Google Chrome

3. **Verificar instalação**:
   ```bash
   cd server
   npm run test
   ```
### ❌ "Servidor retornou status 500"

**Causa**: Erro interno do servidor

**Soluções**:
1. Verifique os logs do servidor
2. Teste com dados mais simples (sem imagens)
3. Reinicie o servidor

### ❌ "Erro na pré-visualização"

**Causa**: Problema no endpoint de preview

**Soluções**:
1. Verifique se o servidor está rodando: `http://localhost:3001/api/health`
2. Teste o endpoint de preview: `http://localhost:3001/api/preview-pdf`
3. Verifique os logs do servidor para erros específicos

### ❌ Deploy falha no Heroku

**Causa**: Buildpacks não configurados

**Solução**:
```bash
heroku buildpacks:clear
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add jontewks/puppeteer
git push heroku main
```

## 💰 Custos Estimados

| Plataforma | Custo Mensal | Recursos |
|------------|--------------|----------|
| Railway    | $0 - $5      | 500h grátis/mês |
| Heroku     | $0 - $7      | 550h grátis/mês |
| Render     | $0 - $7      | 750h grátis/mês |

## 🚀 Vantagens do Puppeteer

✅ **Renderização perfeita**: Como um navegador real
✅ **Layout CSS nativo**: Usa column-count do CSS para distribuição automática
✅ **Suporte completo a CSS**: Flexbox, Grid, etc.
✅ **Imagens de alta qualidade**: Redimensionamento automático
✅ **Layouts complexos**: Tabelas, colunas, quebras de página
✅ **Fontes personalizadas**: Suporte nativo
✅ **Debugging fácil**: HTML visível antes da conversão
✅ **Código simplificado**: Menos complexidade, mais confiabilidade

## 📞 Suporte

Se tiver problemas:

1. **Verifique os logs**: `heroku logs --tail` (Heroku) ou painel do Railway/Render
2. **Teste local**: Sempre teste localmente primeiro
3. **URL correta**: Confirme se a URL no frontend está certa
4. **Health check**: Teste `https://sua-url.com/api/health`

## 🔄 Atualizações

Para atualizar o servidor:

1. **Local**: Reinicie com `npm start`
2. **Railway**: Push para GitHub (deploy automático)
3. **Heroku**: `git push heroku main`
4. **Render**: Push para GitHub (deploy automático)

---

**🎉 Pronto! Agora você tem geração de PDF profissional com layout CSS simplificado!**