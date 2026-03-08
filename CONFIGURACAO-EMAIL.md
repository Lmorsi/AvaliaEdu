# Configuração de Email - Supabase

## Sistema de Recuperação de Senha

Este projeto agora possui um sistema completo de recuperação e redefinição de senha com:

- **Página de Recuperação de Senha** (`/recuperar-senha`)
  - Interface moderna e intuitiva
  - Validação de email
  - Feedback visual claro
  - Instruções detalhadas

- **Página de Redefinição de Senha** (`/redefinir-senha`)
  - Indicador de força de senha
  - Validação em tempo real
  - Requisitos de segurança claros
  - Verificação de senhas coincidentes

## Por que o Email pode não funcionar?

### 1. Ambiente de Desenvolvimento
- No ambiente local, o Supabase usa um servidor SMTP interno
- Os emails podem ser redirecionados para o Inbucket (ferramenta de teste)
- Acesse: http://localhost:54324 para ver emails de teste

### 2. Ambiente de Produção
Por padrão, o Supabase tem limitações no envio de emails em produção:
- **Rate limiting**: Poucos emails por hora
- **Provedor padrão**: Pode ser bloqueado como spam
- **Sem SMTP customizado**: Precisa configurar seu próprio servidor

## Soluções: Configurar SMTP Personalizado

Para garantir que os emails funcionem corretamente em produção, você deve configurar um provedor SMTP profissional:

### Opção 1: Resend (Recomendado)

**Por que Resend?**
- Gratuito até 3.000 emails/mês
- Configuração muito simples
- Alta taxa de entrega
- Boa reputação

**Como Configurar:**

1. Acesse: https://resend.com
2. Crie uma conta gratuita
3. Vá em **API Keys** e crie uma chave
4. No Dashboard do Supabase:
   - Vá em **Project Settings** → **Auth**
   - Role até **SMTP Settings**
   - Configure:
     ```
     Host: smtp.resend.com
     Port: 587
     Username: resend
     Password: [Sua API Key do Resend]
     Sender email: noreply@seudominio.com
     Sender name: Avalia.Edu
     ```

### Opção 2: SendGrid

**Plano Gratuito:**
- 100 emails/dia
- Confiável e amplamente usado

**Como Configurar:**

1. Acesse: https://sendgrid.com
2. Crie uma conta gratuita
3. Gere uma API Key em **Settings** → **API Keys**
4. No Dashboard do Supabase:
   - Configure:
     ```
     Host: smtp.sendgrid.net
     Port: 587
     Username: apikey
     Password: [Sua API Key do SendGrid]
     Sender email: noreply@seudominio.com
     Sender name: Avalia.Edu
     ```

### Opção 3: Amazon SES

**Vantagens:**
- Muito barato (US$ 0,10 por 1.000 emails)
- Altamente escalável
- Ótima infraestrutura

**Como Configurar:**

1. Acesse o AWS Console
2. Vá para Amazon SES
3. Verifique seu domínio ou email
4. Gere credenciais SMTP
5. Configure no Supabase:
   ```
   Host: email-smtp.[sua-regiao].amazonaws.com
   Port: 587
   Username: [SMTP Username da AWS]
   Password: [SMTP Password da AWS]
   ```

### Opção 4: Mailgun

**Plano Gratuito:**
- 5.000 emails/mês nos primeiros 3 meses
- Depois: pay-as-you-go

**Como Configurar:**

1. Acesse: https://mailgun.com
2. Crie uma conta
3. Adicione e verifique seu domínio
4. Pegue as credenciais SMTP
5. Configure no Supabase

## Configurações Importantes no Supabase

### 1. URLs de Redirecionamento

No Dashboard do Supabase, vá em:
**Authentication** → **URL Configuration** → **Redirect URLs**

Adicione:
```
https://seu-dominio.vercel.app/redefinir-senha
http://localhost:5173/redefinir-senha
```

### 2. Templates de Email

Personalize o template de recuperação de senha:
**Authentication** → **Email Templates** → **Reset Password**

Exemplo de template personalizado:
```html
<h2>Recuperação de Senha - Avalia.Edu</h2>
<p>Olá,</p>
<p>Você solicitou a redefinição de sua senha.</p>
<p>Clique no botão abaixo para criar uma nova senha:</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">
  Redefinir Senha
</a>
<p>Este link expira em 1 hora.</p>
<p>Se você não solicitou esta redefinição, ignore este email.</p>
```

### 3. Configurações de Segurança

**Authentication** → **Policies**
- Email Confirmation: Desabilitado (se você desabilitou)
- Secure Password Change: Habilitado
- Password Requirements: Configure requisitos mínimos

## Testando o Sistema

### Em Desenvolvimento:

1. Execute o projeto: `npm run dev`
2. Acesse: http://localhost:5173/recuperar-senha
3. Digite um email válido cadastrado
4. Verifique os emails em: http://localhost:54324 (Inbucket)
5. Clique no link de redefinição
6. Defina a nova senha

### Em Produção:

1. Faça o deploy para Vercel
2. Configure um dos provedores SMTP acima
3. Teste com um email real
4. Verifique se o email chegou (pode levar alguns minutos)
5. Verifique a pasta de spam se não encontrar

## Troubleshooting

### Problema: Email não chega

**Soluções:**
1. Verifique se o SMTP está configurado corretamente
2. Confirme que o email remetente está verificado no provedor
3. Verifique os logs do Supabase: **Project Settings** → **Logs**
4. Teste o SMTP manualmente usando uma ferramenta como smtp-tester

### Problema: Link expirado

**Solução:**
- O link é válido por 1 hora
- Solicite um novo link em `/recuperar-senha`

### Problema: Erro ao redefinir senha

**Soluções:**
1. Verifique se a senha atende aos requisitos:
   - Mínimo 8 caracteres
   - Letras maiúsculas e minúsculas
   - Pelo menos um número
   - Força média ou superior
2. Limpe o cache do navegador
3. Tente em uma janela anônima

## Recursos Adicionais

- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Configurar SMTP no Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend Documentation](https://resend.com/docs)
- [SendGrid SMTP](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)

## Suporte

Se precisar de ajuda adicional:
1. Verifique os logs do Supabase
2. Teste o sistema em desenvolvimento primeiro
3. Consulte a documentação do provedor SMTP escolhido

---
---

# 📋 GUIA DETALHADO: Configuração Passo a Passo para Produção

Este guia detalha **EXATAMENTE** como configurar o sistema de email em produção em 3 passos simples.

---

## 🚀 PASSO 1: Configurar Provedor SMTP (Resend - Gratuito)

### Por que você precisa disso?
O Supabase em produção envia poucos emails e eles podem cair no spam. Um provedor SMTP profissional resolve isso.

### Tempo estimado: 10 minutos

---

### 1.1 Criar Conta no Resend

1. **Acesse**: https://resend.com

2. **Clique em "Sign Up"** (canto superior direito)

3. **Escolha uma opção de cadastro:**
   - Email + senha, OU
   - GitHub login

4. **Confirme seu email**
   - Verifique sua caixa de entrada
   - Clique no link de confirmação

5. **Faça login no dashboard**

---

### 1.2 Obter sua API Key

1. **No dashboard do Resend**, clique em **"API Keys"** (menu lateral esquerdo)

2. **Clique em "Create API Key"**

3. **Dê um nome descritivo:**
   - Exemplo: `Supabase-Avaliaedu-Auth`

4. **Clique em "Add"**

5. **COPIE A API KEY IMEDIATAMENTE!**
   ```
   Formato: re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   - ⚠️ Você NÃO poderá ver essa chave novamente!
   - Cole em um bloco de notas temporariamente

---

### 1.3 Verificar Domínio (Recomendado)

#### Opção A: Tenho um domínio próprio

1. **No menu do Resend**, clique em **"Domains"**

2. **Clique em "Add Domain"**

3. **Digite seu domínio:**
   - Se seu site é `https://meusite.com`, digite: `meusite.com`
   - Se é subdomínio `app.meusite.com`, digite: `app.meusite.com`

4. **O Resend mostrará registros DNS para adicionar:**
   ```
   Tipo: TXT
   Nome: @ (ou seu domínio)
   Valor: resend-verification=xxxxxxxxxx
   ```

5. **Adicione esses registros no seu provedor de domínio:**
   - Se usa Vercel: Vá em Settings → Domains → DNS
   - Se usa Namecheap/GoDaddy: Vá na área de DNS do domínio
   - Cole exatamente os valores fornecidos

6. **Aguarde verificação** (3-15 minutos)
   - O status mudará de "Pending" para "Verified"

#### Opção B: Não tenho domínio (usar domínio de teste)

- Use o domínio: `onboarding.resend.dev`
- Limite: 1 email/dia por endereço (suficiente para testes)
- Não precisa verificar nada

---

### 1.4 Configurar SMTP no Supabase

1. **Acesse**: https://supabase.com/dashboard

2. **Selecione seu projeto** (clique nele)

3. **No menu lateral esquerdo:**
   - Clique no ícone de **engrenagem** (Settings)
   - Ou clique em **"Project Settings"**

4. **No submenu lateral**, clique em **"Auth"**

5. **Role a página para baixo** até encontrar **"SMTP Settings"**

6. **Clique em "Enable Custom SMTP"** (ativar toggle)

7. **Preencha os campos EXATAMENTE assim:**

   ```
   ┌─────────────────────────────────────────────┐
   │ Host: smtp.resend.com                       │
   ├─────────────────────────────────────────────┤
   │ Port: 587                                   │
   ├─────────────────────────────────────────────┤
   │ Username: resend                            │
   ├─────────────────────────────────────────────┤
   │ Password: [COLE SUA API KEY AQUI]          │
   │          re_xxxxxxxxxxxxxxxxxx              │
   └─────────────────────────────────────────────┘
   ```

8. **Na seção "Sender Details":**

   **Se você verificou seu domínio:**
   ```
   ┌─────────────────────────────────────────────┐
   │ Sender email: noreply@seudominio.com        │
   ├─────────────────────────────────────────────┤
   │ Sender name: Avalia.Edu                     │
   └─────────────────────────────────────────────┘
   ```

   **Se está usando domínio de teste:**
   ```
   ┌─────────────────────────────────────────────┐
   │ Sender email: noreply@onboarding.resend.dev │
   ├─────────────────────────────────────────────┤
   │ Sender name: Avalia.Edu                     │
   └─────────────────────────────────────────────┘
   ```

9. **Role até o final da página**

10. **Clique em "SAVE"** (canto inferior direito)

11. **Aguarde a mensagem de confirmação** (aparecerá um toast verde)

---

### 1.5 Testar a Configuração

1. **Abra uma aba anônima no navegador** (Ctrl+Shift+N ou Cmd+Shift+N)

2. **Acesse sua aplicação em produção:**
   - Exemplo: `https://seu-site.vercel.app/recuperar-senha`

3. **Digite um email válido cadastrado no sistema**

4. **Clique em "Enviar Instruções"**

5. **Abra sua caixa de email** (o email digitado)

6. **O email deve chegar em até 1 minuto**
   - ✅ Se chegou: Parabéns! Passo 1 completo!
   - ❌ Se não chegou: Verifique a seção de troubleshooting abaixo

#### Troubleshooting Passo 1:

**Email não chegou?**

1. **Verifique a pasta de SPAM/Lixo eletrônico**

2. **Confira se a API Key está correta:**
   - Volte no Supabase → Project Settings → Auth → SMTP Settings
   - Verifique se não tem espaços extras na API Key
   - A key deve começar com `re_`

3. **Veja os logs no Supabase:**
   - Vá em Project Settings → Logs
   - Clique em "Auth Logs"
   - Procure por erros relacionados a email

4. **Se estiver usando domínio próprio:**
   - Volte no Resend → Domains
   - Confirme que o status está "Verified"
   - Se ainda "Pending", aguarde mais ou use o domínio de teste

5. **Teste com domínio de teste primeiro:**
   - Mude temporariamente para `noreply@onboarding.resend.dev`
   - Se funcionar, o problema é a verificação do seu domínio

---

## 🔗 PASSO 2: Adicionar URLs de Redirecionamento

### Por que você precisa disso?
O Supabase só redireciona usuários para URLs aprovadas (segurança). Precisamos autorizar a URL `/redefinir-senha`.

### Tempo estimado: 5 minutos

---

### 2.1 Descobrir suas URLs

**Você precisa saber onde sua aplicação está rodando:**

**Produção (Vercel/Netlify):**
- Formato: `https://nome-do-projeto.vercel.app`
- Ou domínio próprio: `https://www.meusite.com`

**Para descobrir no Vercel:**
1. Acesse https://vercel.com/dashboard
2. Clique no seu projeto
3. Veja a URL em "Domains"

**Desenvolvimento (opcional):**
- Geralmente: `http://localhost:5173`

---

### 2.2 Acessar Configurações de URL

1. **Acesse**: https://supabase.com/dashboard

2. **Selecione seu projeto**

3. **No menu lateral esquerdo**, clique em **"Authentication"** (ícone de usuário)

4. **No submenu**, clique em **"URL Configuration"**

5. **Você verá a seção "Redirect URLs"**

---

### 2.3 Adicionar URLs (Passo a Passo)

#### Se seu site está em Vercel:

1. **Encontre a URL do seu site**
   - Exemplo: `https://avaliaedu.vercel.app`

2. **Na seção "Redirect URLs" do Supabase**, você verá um campo de texto

3. **Digite a primeira URL:**
   ```
   https://avaliaedu.vercel.app/redefinir-senha
   ```
   (Substitua `avaliaedu.vercel.app` pela SUA URL)

4. **Pressione ENTER ou clique em "Add"**

5. **Digite a segunda URL (curinga):**
   ```
   https://avaliaedu.vercel.app/*
   ```

6. **Pressione ENTER ou clique em "Add"**

7. **Se quiser testar localmente também, adicione:**
   ```
   http://localhost:5173/redefinir-senha
   http://localhost:5173/*
   ```

#### Se você tem domínio próprio:

Adicione TODAS essas variações:

```
https://www.seudominio.com/redefinir-senha
https://www.seudominio.com/*
https://seudominio.com/redefinir-senha
https://seudominio.com/*
```

**Exemplo prático:** Se seu domínio é `avaliacao.com.br`:
```
https://www.avaliacao.com.br/redefinir-senha
https://www.avaliacao.com.br/*
https://avaliacao.com.br/redefinir-senha
https://avaliacao.com.br/*
```

---

### 2.4 Salvar Configurações

1. **Após adicionar todas as URLs**, role até o final da página

2. **Clique em "SAVE"**

3. **Aguarde confirmação** (toast verde no canto)

---

### 2.5 Testar Redirecionamento

1. **Solicite recuperação de senha:**
   - Vá em `/recuperar-senha`
   - Digite seu email
   - Envie

2. **Abra o email recebido**

3. **Clique no botão "Redefinir Senha"**

4. **Você deve ser redirecionado para:**
   ```
   https://seu-site.com/redefinir-senha?token=xxxxxx
   ```

5. **Se ver erro "Invalid redirect URL":**
   - Volte e confira se adicionou a URL corretamente
   - Verifique se usou `https://` (não `http://` em produção)
   - Confirme se clicou em "Save"

#### Troubleshooting Passo 2:

**Erro: "Invalid redirect URL"**

1. **Verifique as URLs adicionadas:**
   - Devem ser EXATAMENTE iguais à URL do seu site
   - Use `https://` para sites em produção
   - Use `http://` apenas para localhost

2. **Adicione o curinga `/*`:**
   - Isso permite todas as rotas do domínio
   - Exemplo: `https://seusite.com/*`

3. **Limpe o cache:**
   - As mudanças podem levar 1-2 minutos para aplicar
   - Tente em uma janela anônima

4. **Verifique se salvou:**
   - Role até o final e clique em "Save"
   - Aguarde o toast de confirmação

---

## ✨ PASSO 3: Personalizar Template de Email (Opcional)

### Por que fazer isso?
O email padrão é genérico. Personalizando, você adiciona sua identidade visual e melhora a experiência.

### Tempo estimado: 10 minutos

---

### 3.1 Acessar Editor de Templates

1. **No dashboard do Supabase**, vá em **"Authentication"**

2. **No submenu**, clique em **"Email Templates"**

3. **Você verá vários templates:**
   - Confirm signup
   - Invite user
   - Magic Link
   - Change Email Address
   - **Reset Password** ← Este é o que vamos editar

4. **Clique em "Reset Password"**

---

### 3.2 Template Profissional Pronto para Usar

**Copie este código** e cole no editor:

```html
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">

  <!-- Header com gradiente azul -->
  <tr>
    <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
        🔐 Recuperação de Senha
      </h1>
      <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">
        Avalia.Edu
      </p>
    </td>
  </tr>

  <!-- Corpo do email -->
  <tr>
    <td style="padding: 40px 30px;">
      <h2 style="color: #1f2937; font-size: 22px; margin: 0 0 20px 0; font-weight: 600;">
        Olá! 👋
      </h2>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Avalia.Edu</strong>.
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Clique no botão abaixo para criar uma nova senha segura:
      </p>

      <!-- Botão de ação -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <a href="{{ .ConfirmationURL }}"
               style="background-color: #2563eb;
                      color: #ffffff;
                      padding: 16px 40px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 600;
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
              ✨ Redefinir Minha Senha
            </a>
          </td>
        </tr>
      </table>

      <!-- Caixa de informações -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
        <tr>
          <td style="background-color: #eff6ff;
                     border-left: 4px solid #2563eb;
                     padding: 20px;
                     border-radius: 8px;">
            <p style="color: #1e40af; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">
              ℹ️ Informações Importantes:
            </p>
            <ul style="color: #1e40af; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Este link <strong>expira em 1 hora</strong></li>
              <li>Pode ser usado <strong>apenas uma vez</strong></li>
              <li>Se você não solicitou, ignore este email</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- Link alternativo -->
      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">
        Se o botão não funcionar, copie e cole este link no seu navegador:
      </p>
      <p style="color: #2563eb;
                font-size: 12px;
                word-break: break-all;
                background-color: #f3f4f6;
                padding: 12px;
                border-radius: 6px;
                margin: 10px 0 0 0;
                font-family: 'Courier New', monospace;">
        {{ .ConfirmationURL }}
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color: #f9fafb;
               padding: 30px;
               text-align: center;
               border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
        Precisa de ajuda? Entre em contato conosco.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2024 Avalia.Edu - Sistema de Avaliação Educacional
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
        Este é um email automático, por favor não responda.
      </p>
    </td>
  </tr>

</table>
```

---

### 3.3 Personalizar o Template (Opcional)

Você pode customizar:

#### Alterar Cores:

Encontre e substitua:
- `#2563eb` (azul principal) → Sua cor primária
- `#4f46e5` (azul escuro) → Sua cor secundária
- `#eff6ff` (fundo azul claro) → Cor de fundo desejada

#### Alterar Textos:

- Linha 9: `"Avalia.Edu"` → Nome do seu sistema
- Linha 50: `"Avalia.Edu"` → Nome do seu sistema
- Linha 86: `"Sistema de Avaliação Educacional"` → Descrição

#### Adicionar Logo (Opcional):

Adicione após a linha 6 (dentro do header):
```html
<img src="https://seu-dominio.com/logo.png"
     alt="Logo Avalia.Edu"
     style="max-width: 120px; height: auto; margin-bottom: 15px;">
```

---

### 3.4 Variáveis do Supabase

Estas variáveis são substituídas automaticamente:

- `{{ .ConfirmationURL }}` - Link de redefinição (OBRIGATÓRIO)
- `{{ .Token }}` - Token de confirmação
- `{{ .TokenHash }}` - Hash do token
- `{{ .SiteURL }}` - URL do seu site

**NUNCA remova `{{ .ConfirmationURL }}`** - é essencial!

---

### 3.5 Salvar Template

1. **Após colar/editar o código**, role até o final

2. **Clique em "Save"**

3. **Aguarde confirmação**

---

### 3.6 Testar o Novo Template

1. **Vá para `/recuperar-senha`**

2. **Solicite recuperação de senha**

3. **Abra o email recebido**

4. **Verifique se está com o novo visual:**
   - Header azul com gradiente
   - Botão azul estilizado
   - Caixa de informações em azul claro
   - Footer com informações da empresa

#### Troubleshooting Passo 3:

**Template não atualizou:**

1. **Aguarde 1-2 minutos** após salvar

2. **Limpe o cache do email:**
   - Use um email diferente para testar
   - Ou teste em outro cliente de email

3. **Verifique se salvou corretamente:**
   - Volte em Email Templates → Reset Password
   - Confirme se o código está lá

**Email chegou sem formatação:**

1. **Verifique se não há erros no HTML:**
   - Todas as tags devem estar fechadas
   - Aspas devem estar corretas

2. **Teste o HTML antes:**
   - Acesse: https://htmledit.squarefree.com/
   - Cole o código
   - Veja se renderiza corretamente

---

## 🎯 Checklist Final de Configuração

Marque conforme completa:

### PASSO 1: SMTP Configurado
- [ ] Conta criada no Resend
- [ ] API Key gerada e copiada
- [ ] Domínio verificado (ou usando domínio de teste)
- [ ] SMTP configurado no Supabase (Host, Port, Username, Password)
- [ ] Sender email e name configurados
- [ ] Teste de envio realizado com sucesso
- [ ] Email chegou na caixa de entrada

### PASSO 2: URLs de Redirecionamento
- [ ] URL de produção identificada
- [ ] URLs adicionadas no Supabase:
  - [ ] `https://seu-site.com/redefinir-senha`
  - [ ] `https://seu-site.com/*`
  - [ ] `http://localhost:5173/redefinir-senha` (opcional)
  - [ ] `http://localhost:5173/*` (opcional)
- [ ] Configurações salvas
- [ ] Teste de redirecionamento funcionou
- [ ] Link do email abre corretamente a página

### PASSO 3: Template de Email (Opcional)
- [ ] Template editado no Supabase
- [ ] Código HTML colado
- [ ] Personalizações feitas (cores, textos, logo)
- [ ] Template salvo
- [ ] Teste visual realizado
- [ ] Email chegou com nova formatação

---

## 🎉 Pronto! Sistema Completo

Se marcou todos os itens acima, seu sistema de recuperação de senha está **100% funcional em produção**!

### O que você conquistou:

✅ Emails profissionais com alta taxa de entrega
✅ Recuperação de senha segura e confiável
✅ Redirecionamentos corretos
✅ Experiência visual moderna e profissional

### Próximas ações:

1. **Monitore os primeiros usos:**
   - Veja os logs do Supabase regularmente
   - Peça feedback dos primeiros usuários

2. **Configure alertas (opcional):**
   - Resend tem métricas de entrega
   - Configure alertas para falhas

3. **Mantenha atualizado:**
   - Verifique o limite de emails mensais
   - Atualize as URLs se mudar o domínio

---

## 🆘 Suporte e Ajuda

### Se algo não funcionar:

1. **Revise o checklist acima** - Certifique-se de completar todos os passos

2. **Veja os logs:**
   - Supabase → Project Settings → Logs → Auth Logs
   - Resend → Dashboard → Logs

3. **Teste em ambiente de desenvolvimento primeiro:**
   - `npm run dev`
   - Vá em http://localhost:5173/recuperar-senha
   - Veja emails em http://localhost:54324

4. **Recursos úteis:**
   - [Documentação Resend](https://resend.com/docs)
   - [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
   - [Teste seu HTML](https://htmledit.squarefree.com/)
   - [Verificar spam](https://www.mail-tester.com/)

---

## ✅ CONFIGURAÇÃO FINALIZADA!

Parabéns! Você tem agora um sistema profissional de recuperação de senha funcionando perfeitamente! 🎊
