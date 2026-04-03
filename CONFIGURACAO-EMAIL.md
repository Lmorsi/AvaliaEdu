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
