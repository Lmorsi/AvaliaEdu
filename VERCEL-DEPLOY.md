# 🚀 Deploy na Vercel - Guia Completo

## Método 1: Deploy via Interface Web (RECOMENDADO)

### Passo 1: Preparar o GitHub (se ainda não estiver lá)

Se o código ainda não está no GitHub:

1. Acesse [github.com](https://github.com) e faça login
2. Clique no "+" no canto superior direito → "New repository"
3. Nome do repositório: `intuitive-perception` (ou outro nome)
4. Deixe como "Public" ou "Private" (ambos funcionam)
5. **NÃO** marque "Initialize with README"
6. Clique em "Create repository"

7. No terminal, execute estes comandos na pasta do projeto:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

### Passo 2: Deploy na Vercel

1. **Acesse**: [vercel.com](https://vercel.com)
2. **Login**: Clique em "Sign Up" e escolha "Continue with GitHub"
3. **Autorize** a Vercel a acessar seus repositórios
4. **Novo Projeto**: Clique em "Add New..." → "Project"
5. **Selecione** seu repositório da lista
6. **Clique** em "Import"

### Passo 3: Configurar o Projeto

Na página de configuração:

1. **Framework Preset**: Vercel detectará automaticamente "Vite"
2. **Root Directory**: Deixe vazio (raiz do projeto)
3. **Build Command**: `npm run build` (já preenchido)
4. **Output Directory**: `dist` (já preenchido)

### Passo 4: Adicionar Variáveis de Ambiente

Role até a seção **"Environment Variables"**:

Adicione estas duas variáveis:

```
Nome: VITE_SUPABASE_URL
Valor: https://xfxpwsizzxmxntspfiax.supabase.co

Nome: VITE_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmeHB3c2l6enhteG50c3BmaWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODIyNjcsImV4cCI6MjA4Njg1ODI2N30.giwbL1O8eVl9MhTM1oVNWE-Rwpuc2qRmtT5Ih7qvfmE
```

### Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos (a Vercel vai instalar dependências e fazer o build)
3. Quando aparecer os confetes 🎉, seu site está no ar!

### Passo 6: Acessar seu Site

A Vercel criará uma URL como:
- `https://seu-projeto.vercel.app`
- ou `https://seu-projeto-seu-usuario.vercel.app`

**Copie essa URL** - é seu link público!

---

## Método 2: Deploy via CLI (Alternativa)

Se preferir usar terminal:

### 1. Instalar Vercel CLI
```bash
npm install -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

Siga as perguntas:
- Set up and deploy? **Yes**
- Which scope? Escolha sua conta
- Link to existing project? **No**
- What's your project's name? **intuitive-perception**
- In which directory is your code? **./** (enter)
- Want to modify settings? **No**

### 4. Adicionar variáveis de ambiente
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Cole os valores quando solicitado.

### 5. Deploy em produção
```bash
vercel --prod
```

---

## ⚙️ Configurações Adicionais

### Domínio Personalizado (Opcional)

Se você tem um domínio próprio (exemplo: meusite.com):

1. No dashboard da Vercel, vá em "Settings" → "Domains"
2. Clique em "Add Domain"
3. Digite seu domínio
4. Configure os DNS conforme instruções da Vercel

### CORS do Supabase

Certifique-se de que sua URL da Vercel está autorizada no Supabase:

1. Acesse [supabase.com](https://supabase.com)
2. Selecione seu projeto
3. Settings → API → "URL Configuration"
4. Adicione sua URL da Vercel (exemplo: `https://seu-projeto.vercel.app`)

---

## 🔄 Atualizações Automáticas

Toda vez que você fizer push no GitHub:
```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

A Vercel fará o deploy automaticamente em 2-3 minutos!

---

## 📊 Monitoramento

No dashboard da Vercel você pode ver:
- Logs de deploy
- Analytics de acesso
- Performance do site
- Erros em produção

---

## 🆘 Problemas Comuns

### Build falhou?
- Verifique se as variáveis de ambiente foram adicionadas corretamente
- Confira os logs de build na Vercel

### Site não carrega?
- Verifique o console do navegador (F12)
- Confirme que as variáveis de ambiente estão corretas

### Erro de CORS?
- Adicione a URL da Vercel nas configurações do Supabase
