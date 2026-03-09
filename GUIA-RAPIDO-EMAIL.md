# 🚀 Guia Rápido - Configuração de Email em 3 Passos

## ⚡ Resumo Executivo

Configure o sistema de recuperação de senha em produção em aproximadamente **25 minutos**.

---

## 📝 PASSO 1: Configurar SMTP (10 min)

### 1.1 Criar conta no Resend
1. Acesse: https://resend.com
2. Clique em "Sign Up"
3. Crie conta com email ou GitHub
4. Confirme seu email

### 1.2 Obter API Key
1. Dashboard → "API Keys"
2. "Create API Key"
3. Nome: `Supabase-Auth`
4. **Copie e guarde**: `re_xxxxxxxxxx`

### 1.3 Configurar no Supabase
1. Dashboard Supabase → Project Settings → Auth
2. Role até "SMTP Settings"
3. "Enable Custom SMTP"
4. Preencha:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [Sua API Key]
   Sender email: noreply@onboarding.resend.dev
   Sender name: Avalia.Edu
   ```
5. Clique em "Save"

### 1.4 Testar
1. Vá em `/recuperar-senha`
2. Digite seu email
3. Verifique sua caixa de entrada
4. ✅ Email deve chegar em 1 minuto

---

## 🔗 PASSO 2: Configurar URLs (5 min)

### 2.1 Descobrir sua URL
- Vercel: Vai no dashboard e veja em "Domains"
- Exemplo: `https://avaliaedu.vercel.app`

### 2.2 Adicionar no Supabase
1. Dashboard Supabase → Authentication → URL Configuration
2. Na seção "Redirect URLs", adicione:
   ```
   https://seu-site.vercel.app/redefinir-senha
   https://seu-site.vercel.app/*
   http://localhost:5173/redefinir-senha
   http://localhost:5173/*
   ```
3. Clique em "Save"

### 2.3 Testar
1. Solicite recuperação de senha
2. Abra o email
3. Clique no botão
4. ✅ Deve abrir `/redefinir-senha` no seu site

---

## ✨ PASSO 3: Template de Email (10 min) - Opcional

### 3.1 Acessar editor
1. Dashboard Supabase → Authentication → Email Templates
2. Clique em "Reset Password"

### 3.2 Colar template
1. Abra o arquivo `CONFIGURACAO-EMAIL.md`
2. Procure por "Template Profissional Pronto para Usar"
3. Copie todo o código HTML
4. Cole no editor do Supabase
5. Clique em "Save"

### 3.3 Personalizar (opcional)
- Altere "Avalia.Edu" para o nome do seu sistema
- Mude as cores se desejar
- Adicione seu logo

### 3.4 Testar
1. Solicite recuperação de senha
2. Abra o email
3. ✅ Deve estar com visual moderno e profissional

---

## ✅ Checklist Rápido

```
PASSO 1 - SMTP:
[ ] Conta Resend criada
[ ] API Key copiada
[ ] SMTP configurado no Supabase
[ ] Email de teste enviado e recebido

PASSO 2 - URLs:
[ ] URL do site identificada
[ ] URLs adicionadas no Supabase
[ ] Redirecionamento testado

PASSO 3 - Template (Opcional):
[ ] Template colado e salvo
[ ] Email com novo visual recebido
```

---

## 🆘 Problemas Comuns

### Email não chega
1. Verifique pasta de spam
2. Confirme API Key no Supabase
3. Veja logs: Supabase → Project Settings → Logs

### Erro "Invalid redirect URL"
1. Verifique se usou `https://` (não `http://`)
2. Confirme se adicionou o `/*`
3. Clique em "Save" nas configurações

### Template não atualiza
1. Aguarde 2 minutos
2. Teste com email diferente
3. Limpe cache do navegador

---

## 📚 Documentação Completa

Para detalhes completos e troubleshooting avançado, veja:
- `CONFIGURACAO-EMAIL.md` - Guia detalhado passo a passo

---

## 🎉 Pronto!

Após completar os 3 passos, seu sistema está 100% funcional em produção!

**Teste final:**
1. Vá em `/recuperar-senha`
2. Digite um email cadastrado
3. Abra o email recebido
4. Clique no botão
5. Redefina sua senha
6. Faça login com a nova senha

✅ Tudo funcionando? Parabéns! 🎊
