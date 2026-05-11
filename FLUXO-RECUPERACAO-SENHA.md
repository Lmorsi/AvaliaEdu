# 🔄 Fluxo Completo: Recuperação de Senha

## Diagrama Visual do Processo

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUÁRIO ESQUECEU A SENHA                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 1: Acessa /recuperar-senha                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  • Página com design moderno                              │  │
│  │  • Campo para digitar email                               │  │
│  │  • Validação em tempo real                                │  │
│  │  • Botão "Enviar Instruções"                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 2: Frontend envia requisição para Supabase Auth         │
│                                                                  │
│  supabase.auth.resetPasswordForEmail(email, {                   │
│    redirectTo: 'https://seusite.com/redefinir-senha'           │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 3: Supabase processa                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Verifica se email existe no sistema                   │  │
│  │  2. Gera token único e seguro                             │  │
│  │  3. Define expiração (1 hora)                             │  │
│  │  4. Prepara email com template                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 4: Supabase envia email via SMTP (Resend)               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  De: noreply@seudominio.com                               │  │
│  │  Para: usuario@email.com                                  │  │
│  │  Assunto: Recuperação de Senha - Avalia.Edu              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  🔐 Recuperação de Senha                           │  │  │
│  │  │                                                     │  │  │
│  │  │  Olá!                                               │  │  │
│  │  │                                                     │  │  │
│  │  │  Recebemos solicitação para redefinir sua senha.   │  │  │
│  │  │                                                     │  │  │
│  │  │  [ ✨ Redefinir Minha Senha ]                      │  │  │
│  │  │                                                     │  │  │
│  │  │  Link expira em 1 hora                             │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 5: Usuário recebe email                                  │
│  • Email chega na caixa de entrada (não spam)                   │
│  • Visualiza template profissional                              │
│  • Vê instruções claras                                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 6: Usuário clica no botão/link                          │
│                                                                  │
│  Link: https://seusite.com/redefinir-senha?token=xyz...        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 7: Supabase valida redirecionamento                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  • Verifica se URL está na lista autorizada               │  │
│  │  • Valida token                                           │  │
│  │  • Cria sessão temporária                                 │  │
│  │  • Redireciona para /redefinir-senha                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 8: Página /redefinir-senha carrega                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  • Verifica se sessão é válida                            │  │
│  │  • Se inválida: mostra "Link expirado"                    │  │
│  │  • Se válida: mostra formulário de nova senha             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  🔒 Redefinir Senha                                 │  │  │
│  │  │                                                     │  │  │
│  │  │  Nova senha: [________] 👁                         │  │  │
│  │  │  Força: ████░░ Média                               │  │  │
│  │  │                                                     │  │  │
│  │  │  Confirmar:  [________] 👁                         │  │  │
│  │  │  ✓ Senhas coincidem                                │  │  │
│  │  │                                                     │  │  │
│  │  │  Requisitos:                                        │  │  │
│  │  │  ✓ 8+ caracteres                                   │  │  │
│  │  │  ✓ Maiúsculas e minúsculas                         │  │  │
│  │  │  ✓ Pelo menos 1 número                             │  │  │
│  │  │  ✓ Caractere especial                              │  │  │
│  │  │                                                     │  │  │
│  │  │  [ Redefinir Senha ]                               │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 9: Usuário define nova senha                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  • Digita senha (validação em tempo real)                 │  │
│  │  • Vê indicador de força                                  │  │
│  │  • Confirma senha                                         │  │
│  │  • Sistema valida requisitos                             │  │
│  │  • Clica em "Redefinir Senha"                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 10: Frontend envia para Supabase                        │
│                                                                  │
│  supabase.auth.updateUser({ password: novaSenha })              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 11: Supabase atualiza senha                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Valida token ainda está válido                        │  │
│  │  2. Hash da nova senha (bcrypt)                           │  │
│  │  3. Atualiza no banco de dados                            │  │
│  │  4. Invalida token usado                                  │  │
│  │  5. Retorna sucesso                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 12: Confirmação de sucesso                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  ✓ Senha Redefinida!                               │  │  │
│  │  │                                                     │  │  │
│  │  │  Sua senha foi atualizada com sucesso.             │  │  │
│  │  │  Redirecionando para login...                      │  │  │
│  │  │                                                     │  │  │
│  │  │  ⏱ Aguarde...                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 13: Redirecionamento automático (3s)                    │
│                                                                  │
│  navigate('/login')                                             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 14: Usuário faz login com nova senha                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Email: usuario@email.com                                 │  │
│  │  Senha: [nova senha]                                      │  │
│  │  [ Entrar ]                                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              ✅ ACESSO RESTAURADO COM SUCESSO! ✅               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Aspectos de Segurança

### Token Único
- Gerado aleatoriamente pelo Supabase
- Válido por 1 hora apenas
- Uso único (após usado, é invalidado)
- Não pode ser reutilizado

### Validações
```
┌──────────────────────────────────────┐
│  Validações no Frontend              │
├──────────────────────────────────────┤
│  ✓ Email válido                      │
│  ✓ Senha >= 8 caracteres             │
│  ✓ Maiúsculas + minúsculas           │
│  ✓ Pelo menos 1 número               │
│  ✓ Caractere especial                │
│  ✓ Senhas coincidem                  │
│  ✓ Força >= Média                    │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Validações no Supabase (Backend)    │
├──────────────────────────────────────┤
│  ✓ Token válido e não expirado       │
│  ✓ Token não foi usado antes         │
│  ✓ Sessão autenticada                │
│  ✓ URL de redirecionamento aprovada  │
│  ✓ Senha hasheada com bcrypt         │
└──────────────────────────────────────┘
```

### SMTP Seguro
```
Resend (SMTP Provider)
├─ Autenticação por API Key
├─ Conexão TLS/SSL
├─ Verificação de domínio SPF/DKIM
├─ Taxa de entrega 99.5%+
└─ Proteção contra spam
```

---

## ⏱️ Timeline Típico

```
Tempo desde solicitação até conclusão:
┌────────┬──────────────────────────────────────┐
│  0s    │ Usuário clica "Enviar Instruções"    │
│  0.5s  │ Frontend valida e envia para backend │
│  1s    │ Supabase gera token                  │
│  2s    │ Email enviado via Resend             │
│  5-30s │ Email chega na caixa de entrada      │
│  ---   │ Usuário abre email                   │
│  +0s   │ Clica no botão                       │
│  0.5s  │ Supabase valida e redireciona        │
│  1s    │ Página /redefinir-senha carrega      │
│  ---   │ Usuário preenche nova senha          │
│  +0s   │ Clica "Redefinir Senha"              │
│  1s    │ Supabase atualiza senha              │
│  1.5s  │ Confirmação exibida                  │
│  4.5s  │ Redireciona para login               │
└────────┴──────────────────────────────────────┘

Total: ~10-35 segundos (maioria é tempo de email)
```

---

## 🎯 Pontos Críticos de Configuração

### 1. SMTP Configurado
```
SEM SMTP:                      COM SMTP (Resend):
┌──────────────────┐           ┌──────────────────┐
│ Supabase padrão  │           │ Resend SMTP      │
│ └─ Rate limit    │           │ └─ 3000/mês      │
│ └─ Vai pra spam  │           │ └─ 99.5% entrega │
│ └─ Lento         │           │ └─ Rápido        │
│ └─ Não confiável │           │ └─ Confiável     │
└──────────────────┘           └──────────────────┘
     ❌ NÃO USE                      ✅ USE
```

### 2. URLs de Redirecionamento
```
SEM URLs CONFIGURADAS:         COM URLs CONFIGURADAS:
┌──────────────────┐           ┌──────────────────┐
│ Link do email    │           │ Link do email    │
│      ↓           │           │      ↓           │
│ ❌ ERRO          │           │ ✅ Redireciona   │
│ "Invalid URL"    │           │ Abre /redefinir  │
└──────────────────┘           └──────────────────┘
```

### 3. Template Personalizado
```
TEMPLATE PADRÃO:               TEMPLATE CUSTOMIZADO:
┌──────────────────┐           ┌──────────────────┐
│ Genérico         │           │ Com sua marca    │
│ Sem logo         │           │ Com logo         │
│ Texto simples    │           │ Visual moderno   │
│ Pouco confiável  │           │ Profissional     │
└──────────────────┘           └──────────────────┘
     ⚠️ OK                          ⭐ MELHOR
```

---

## 🚨 Cenários de Erro

### Erro 1: Link Expirado
```
Usuário espera > 1 hora
        ↓
Clica no link
        ↓
┌──────────────────────────────────┐
│  ⚠️ Link Inválido ou Expirado   │
│                                   │
│  Solicite um novo link de        │
│  recuperação.                     │
│                                   │
│  [ Solicitar Novo Link ]          │
└──────────────────────────────────┘

Solução: Solicitar novo email
```

### Erro 2: Senha Fraca
```
Usuário digita senha fraca
        ↓
Sistema valida
        ↓
┌──────────────────────────────────┐
│  ❌ Senha muito fraca            │
│                                   │
│  Força: ██░░░░ Fraca             │
│                                   │
│  Sua senha deve ter:              │
│  • Mais caracteres                │
│  • Letras maiúsculas              │
│  • Números                        │
│  • Caracteres especiais           │
└──────────────────────────────────┘

Solução: Sistema bloqueia botão até
senha ser forte o suficiente
```

### Erro 3: Email Não Cadastrado
```
Usuário digita email não cadastrado
        ↓
Sistema processa normalmente
        ↓
Não envia email (segurança)
        ↓
Mostra mensagem de sucesso
(não revela se email existe)

Nota: Previne descoberta de emails
cadastrados por atacantes
```

---

## 📊 Métricas de Sucesso

### O que monitorar:

```
Dashboard Resend:
├─ Taxa de entrega: > 99%
├─ Emails bounced: < 1%
├─ Emails marcados como spam: < 0.1%
└─ Tempo de entrega: < 30s

Dashboard Supabase (Auth Logs):
├─ Solicitações de reset: Todas registradas
├─ Erros de envio: 0
├─ Tokens expirados: Normal
└─ Redefinições bem-sucedidas: Tracking
```

---

## 🎓 Notas Técnicas

### Hash da Senha
```javascript
// Supabase usa bcrypt automaticamente
// Você NÃO precisa fazer hash manualmente

// ❌ NÃO FAÇA:
const hashedPassword = bcrypt.hash(password)

// ✅ FAÇA (Supabase cuida disso):
supabase.auth.updateUser({ password })
```

### Validação de Token
```javascript
// Verificação automática na página
useEffect(() => {
  const checkSession = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      setIsValidToken(false) // Mostra erro
    }
  }
  checkSession()
}, [])
```

---

## ✅ Checklist de Funcionamento

Use este checklist para validar se tudo está funcionando:

```
□ Passo 1: Solicitação
  □ Acessa /recuperar-senha
  □ Digita email cadastrado
  □ Clica em "Enviar Instruções"
  □ Vê mensagem de sucesso

□ Passo 2: Recebimento
  □ Email chega em < 1 minuto
  □ Não está na pasta de spam
  □ Template está formatado corretamente
  □ Botão é clicável

□ Passo 3: Redirecionamento
  □ Clique no botão abre o site
  □ URL é https://seusite.com/redefinir-senha
  □ Página carrega corretamente
  □ Formulário está visível

□ Passo 4: Redefinição
  □ Pode digitar nova senha
  □ Indicador de força funciona
  □ Confirmação de senha valida
  □ Botão é habilitado quando válido

□ Passo 5: Conclusão
  □ Clique em "Redefinir Senha"
  □ Vê mensagem de sucesso
  □ Redirecionado para login
  □ Login funciona com nova senha
```

---

## 🎉 Sistema Completo!

Este fluxo representa um sistema de recuperação de senha de **nível profissional** com:

✅ Segurança robusta
✅ UX moderna e intuitiva
✅ Validações em tempo real
✅ Feedback claro em cada etapa
✅ Prevenção de erros comuns
✅ Performance otimizada
✅ Compatível com melhores práticas

**Documentação relacionada:**
- `CONFIGURACAO-EMAIL.md` - Configuração detalhada
- `GUIA-RAPIDO-EMAIL.md` - Setup rápido em 3 passos
