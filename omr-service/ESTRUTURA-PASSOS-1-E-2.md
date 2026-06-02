# Estrutura do Projeto - Passos 1 e 2

## Estrutura Atual da Pasta `omr-service`

```
omr-service/
│
├── 📄 main.py                          ✅ MODIFICADO
│   └── Agora com:
│       - import dotenv
│       - load_dotenv()
│       - host="0.0.0.0"
│       - Suporte a PORT, ALLOWED_ORIGINS
│
├── 📄 requirements.txt                 ✅ ATUALIZADO
│   └── Adicionado: python-dotenv==1.0.0
│
├── 📄 runtime.txt                      ✅ CRIADO (NOVO)
│   └── Contém: python-3.11.7
│
├── 📄 Dockerfile                       ✅ EXISTENTE
│   └── Já pronto para Railway
│
├── 📄 .env.example                     ✅ CRIADO (NOVO)
│   └── Variáveis de exemplo:
│       - PORT=8000
│       - ALLOWED_ORIGINS=...
│       - LOG_LEVEL=INFO
│       - ENVIRONMENT=production
│
├── 📄 .gitignore                       ✅ CRIADO (NOVO)
│   └── Impede upload de:
│       - __pycache__/
│       - .env
│       - venv/
│
├── 📄 .env                             ❌ CRIAR LOCALMENTE (não vai para Git)
│   └── Copie de .env.example
│
├── 📄 PASSO-1-E-2-RAILWAY.md           ℹ️ GUIA DETALHADO
├── 📄 PASSOS-1-E-2-RESUMIDO.md         ℹ️ GUIA RÁPIDO
│
├── 📄 test_server.py                   🧪 TESTE LOCAL (NOVO)
│   └── Script Python para testar
│
├── 📄 test-local.sh                    🧪 TESTE LOCAL (NOVO)
│   └── Script Bash para testar
│
├── omr/                                (Seu código existente)
│   ├── __init__.py
│   ├── bubble.py
│   ├── fiducial.py
│   ├── models.py
│   ├── perspective.py
│   └── qr_reader.py
│
├── 📁 Dockerfile                       (Existente)
│
└── ...outros arquivos...

```

---

## O que foi criado/modificado

| Arquivo | Status | O que faz |
|---------|--------|----------|
| `main.py` | 🔄 Modificado | Agora suporta variáveis de ambiente |
| `requirements.txt` | 🔄 Atualizado | Adicionado `python-dotenv` |
| `runtime.txt` | ✨ Novo | Define versão Python 3.11.7 |
| `Dockerfile` | ✓ Existente | Já pronto para Railway |
| `.env.example` | ✨ Novo | Exemplo de variáveis de ambiente |
| `.gitignore` | ✨ Novo | Protege dados sensíveis |
| `PASSO-1-E-2-RAILWAY.md` | ℹ️ Novo | Guia detalhado em Português |
| `PASSOS-1-E-2-RESUMIDO.md` | ℹ️ Novo | Versão resumida |
| `test_server.py` | 🧪 Novo | Testa o servidor localmente |
| `test-local.sh` | 🧪 Novo | Testa com bash/shell |

---

## Flow: O que acontece em cada fase

```
┌─────────────────────────────────────────────────────────┐
│                    PASSO 1                              │
│               Preparar Dependências                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─ ✅ requirements.txt (pacotes Python)
                   ├─ ✅ runtime.txt (Python 3.11.7)
                   ├─ ✅ Dockerfile (container config)
                   ├─ ✅ .env.example (variáveis)
                   └─ ✅ .gitignore (segurança)
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    PASSO 2                              │
│            Configurar Servidor Python                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─ ✅ main.py com dotenv
                   ├─ ✅ host="0.0.0.0"
                   ├─ ✅ Variáveis de ambiente
                   └─ ✅ CORS configurado
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│               TESTAR LOCALMENTE                         │
│    python main.py  →  curl http://localhost:8000/api   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─ ✅ Health check: OK
                   ├─ ✅ OpenCV: Disponível
                   ├─ ✅ QR Reader: Disponível
                   └─ ✅ Server: Rodando em 0.0.0.0:8000
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  GIT COMMIT                             │
│        git add . && git commit && git push              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│         PRONTO PARA RAILWAY (Próximos Passos)           │
└─────────────────────────────────────────────────────────┘
```

---

## Variáveis de Ambiente Explicadas

### No desenvolvimento (`.env`)
```bash
PORT=8000                                    # Porta local
ALLOWED_ORIGINS=http://localhost:5173       # Frontend local
ENVIRONMENT=development                      # Modo dev
LOG_LEVEL=DEBUG                              # Logs detalhados
```

### No Railway (Dashboard Variables)
```bash
PORT=8000                                    # Railway escolhe a porta
ALLOWED_ORIGINS=https://frontend.vercel.app,https://seu-servidor.railway.app
ENVIRONMENT=production                       # Modo produção
LOG_LEVEL=INFO                               # Logs normais
```

---

## Como Testar (3 opções)

### Opção 1: Usar o script Python
```bash
python test_server.py
```

### Opção 2: Usar cURL
```bash
curl http://localhost:8000/api/health
```

### Opção 3: Browser
```
http://localhost:8000/docs
```

---

## Resumo: O que cada coisa faz

| Componente | Função | Para quem |
|-----------|--------|----------|
| `requirements.txt` | Lista dependências | Railway / Docker |
| `runtime.txt` | Define Python version | Railway |
| `Dockerfile` | Cria container | Docker / Railway |
| `main.py` | Servidor FastAPI | Você / Usuários |
| `.env.example` | Template de config | Você (referência) |
| `.env` | Configuração atual | Você (não vai para Git) |
| `test_server.py` | Valida funcionamento | Você (testes) |

---

## Próximo Passo

Quando tiver sucesso nos testes locais:

```bash
# 1. Commit tudo
git add .
git commit -m "Setup: Add Railway deployment configuration"

# 2. Push para GitHub
git push origin main

# 3. Ir para o Passo 3: https://railway.app
```

---

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "ModuleNotFoundError" | `pip install python-dotenv` |
| "Port 8000 in use" | `PORT=8001 python main.py` |
| "Connection refused" | Verifique `host="0.0.0.0"` |
| ".env não carrega" | Use `cp .env.example .env` |
| "CORS error" | Configure `ALLOWED_ORIGINS` |

