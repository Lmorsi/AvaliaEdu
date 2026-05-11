# Como Resolver: Error sending recovery email (500)

## Problema Identificado

O erro `AuthApiError: Error sending recovery email` com status **500 (Internal Server Error)** indica que o Supabase não consegue enviar emails através do servidor SMTP configurado (Resend).

---

## Solução Passo a Passo

### 1. Verificar Configurações no Resend

Acesse: https://resend.com/emails

#### Checklist:
- [ ] Sua API Key está ativa e não foi revogada
- [ ] O domínio/email remetente está verificado
- [ ] Você não ultrapassou o limite de envios (gratuito: 100 emails/dia)
- [ ] Não há erros nos logs de envio do Resend

#### Obter a API Key:
1. Acesse: https://resend.com/api-keys
2. Copie a API Key (começa com `re_`)
3. **IMPORTANTE:** Guarde essa key, ela só é mostrada uma vez

---

### 2. Configurar SMTP no Supabase

Acesse: https://supabase.com/dashboard/project/xfxpwsizzxmxntspfiax/settings/auth

#### Vá para "SMTP Settings" e configure:

```
Enable Custom SMTP: ✅ ATIVADO

SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: [SUA_API_KEY_DO_RESEND]  ← Cole a API Key aqui

Sender Email: onboarding@resend.dev    ← Use este email para teste
Sender Name: Avalia-Edu
```

**ATENÇÃO:**
- O campo "SMTP Password" deve conter sua **API Key do Resend** (não é uma senha comum)
- Se você estiver no plano gratuito do Resend, use `onboarding@resend.dev` como Sender Email
- Se tiver um domínio verificado, use `noreply@seudominio.com`

---

### 3. Configurar Email Templates no Supabase

Acesse: https://supabase.com/dashboard/project/xfxpwsizzxmxntspfiax/auth/templates

#### Para cada template (Confirmation, Reset Password, etc):

Verifique se está configurado:
```
Subject: [Assunto apropriado]
Body: [Template HTML/texto]
Sender Email: onboarding@resend.dev  ← Deve ser o mesmo do SMTP
```

---

### 4. Configurar URLs de Redirecionamento

Acesse: https://supabase.com/dashboard/project/xfxpwsizzxmxntspfiax/auth/url-configuration

#### Adicione estas URLs à whitelist:

```
Site URL: https://avalia-edu-git-main-lucasmorsi.vercel.app

Redirect URLs:
https://avalia-edu-git-main-lucasmorsi.vercel.app/redefinir-senha
https://avalia-edu-git-main-lucasmorsi.vercel.app/**
http://localhost:5173/**
```

---

### 5. Limitações do Plano Gratuito do Resend

Se você estiver usando o plano **gratuito** do Resend:

#### Limitações:
- ✅ 100 emails por dia
- ✅ 3.000 emails por mês
- ❌ Só pode enviar para emails verificados manualmente
- ✅ Domínio `resend.dev` já vem verificado

#### Solução para Teste:
Use `onboarding@resend.dev` como remetente. Isso permite enviar para qualquer destinatário.

#### Solução Permanente:
1. Verifique seu próprio domínio no Resend, OU
2. Faça upgrade para o plano pago (permite enviar para qualquer email)

---

### 6. Testar a Configuração

Depois de configurar tudo:

1. **Aguarde 2-3 minutos** para as alterações propagarem
2. Acesse: https://avalia-edu-git-main-lucasmorsi.vercel.app/test-email
3. Clique em "Testar Reset Password"
4. Verifique o resultado

#### Se ainda der erro:
- Verifique o console do navegador (F12)
- Verifique os logs do Supabase
- Verifique os logs do Resend

---

## Troubleshooting Avançado

### Erro persiste após configuração?

#### 1. Verificar se a API Key está correta:
```bash
# Teste a API Key diretamente no terminal:
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer SUA_API_KEY_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "seu-email@exemplo.com",
    "subject": "Teste",
    "text": "Email de teste"
  }'
```

Se retornar erro 401/403: A API Key está incorreta.

#### 2. Verificar logs do Supabase:
- Acesse: https://supabase.com/dashboard/project/xfxpwsizzxmxntspfiax/logs/explorer
- Filtro: `auth` e procure por erros SMTP

#### 3. Verificar rate limit:
O Supabase limita requisições de reset password para **1 a cada 60 segundos** por email.
Aguarde 1 minuto entre tentativas.

---

## Alternativa: Usar Email do Supabase (Temporário)

Se você quiser apenas testar sem configurar SMTP:

1. **Desabilite** o Custom SMTP no Supabase
2. Use o serviço de email padrão do Supabase (limitado a 3 emails/hora em dev)

**ATENÇÃO:** Não recomendado para produção!

---

## Resumo de Configurações Corretas

### No Resend:
- ✅ API Key criada e copiada
- ✅ Domínio verificado (ou usar `resend.dev`)

### No Supabase (SMTP Settings):
- ✅ Custom SMTP: Ativado
- ✅ Host: `smtp.resend.com`
- ✅ Port: `587`
- ✅ User: `resend`
- ✅ Password: `[API_KEY_DO_RESEND]`
- ✅ Sender Email: `onboarding@resend.dev`

### No Supabase (URL Configuration):
- ✅ Site URL configurada
- ✅ Redirect URLs adicionadas

---

## Precisa de Ajuda?

Se o erro persistir após seguir todos os passos:

1. Tire screenshots das configurações SMTP no Supabase
2. Tire screenshots dos logs do Resend
3. Compartilhe a mensagem de erro completa do console
4. Verifique se sua conta Resend está ativa e sem bloqueios

---

**Última atualização:** 2026-02-17
