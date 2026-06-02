# 🚀 Guia Simples: Passos 1 e 2 para Railway

## O que você vai fazer

Você vai preparar seu servidor Python para rodar na nuvem (Railway).

---

## PASSO 1: Preparar as Dependências (O que o servidor precisa)

### 📦 Você precisa de 5 arquivos

#### 1. `requirements.txt` - Lista do que instalar
```
fastapi
uvicorn
opencv-contrib-python-headless
pyzbar
numpy
pydantic
pillow
python-dotenv
```

**Por quê?** Quando o Railway cria o servidor, ele lê esse arquivo e instala tudo.

**Status**: ✅ JÁ EXISTE

---

#### 2. `runtime.txt` - Qual Python usar
```
python-3.11.7
```

**Por quê?** Diz ao Railway qual versão do Python usar.

**Status**: ✅ CRIADO

---

#### 3. `Dockerfile` - Receita para criar o servidor
```dockerfile
FROM python:3.12-slim
RUN apt-get install -y libzbar0 libgl1 libglib2.0-0
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Por quê?** É a instrução que diz como construir o container.

**Status**: ✅ EXISTE

---

#### 4. `.env.example` - Exemplo de configuração
```
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
ENVIRONMENT=production
```

**Por quê?** Mostra quais variáveis são necessárias.

**Status**: ✅ CRIADO

---

#### 5. `.gitignore` - O que NÃO enviar
```
__pycache__/
.env
venv/
```

**Por quê?** Protege dados sensíveis (senhas, chaves).

**Status**: ✅ CRIADO

---

## PASSO 2: Configurar o Servidor Python

### 🐍 Modificar `main.py`

#### A. Adicionar no topo:
```python
from dotenv import load_dotenv
load_dotenv()
```

**O que faz?** Carrega variáveis de ambiente do arquivo `.env`.

---

#### B. Usar variáveis de ambiente:
```python
port = int(os.getenv("PORT", 8000))
log_level = os.getenv("LOG_LEVEL", "INFO")
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
```

**O que faz?** Permite que Railway configure o servidor sem editar código.

---

#### C. Configurar CORS:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
```

**O que faz?** Permite que o frontend (React) chame seu servidor.

---

#### D. Iniciar com `host="0.0.0.0"`:
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",     # 🔑 IMPORTANTE: Acessível de qualquer lugar
        port=port,
        reload=False,
    )
```

**Por quê?** Se usar `localhost`, ninguém de fora consegue acessar.

---

## ✅ Status Atual

- ✅ `requirements.txt` atualizado com `python-dotenv`
- ✅ `runtime.txt` criado com `python-3.11.7`
- ✅ `Dockerfile` pronto
- ✅ `.env.example` criado
- ✅ `.gitignore` criado
- ✅ `main.py` modificado com suporte a variáveis
- ✅ Servidor configurado com `host="0.0.0.0"`

---

## 🧪 Testar Localmente (Importante!)

### No seu computador, faça:

```bash
# 1. Entrar na pasta
cd omr-service

# 2. Criar ambiente isolado
python -m venv venv

# 3. Ativar (Linux/Mac)
source venv/bin/activate
# Ou ativar (Windows)
venv\Scripts\activate

# 4. Instalar dependências
pip install -r requirements.txt

# 5. Criar arquivo .env
cp .env.example .env

# 6. Rodar servidor
python main.py
```

### Você deve ver:
```
INFO     Starting OMR server on port 8000 (development)
INFO     Uvicorn running on http://0.0.0.0:8000
```

### Testar em outro terminal:
```bash
curl http://localhost:8000/api/health
```

### Resposta esperada:
```json
{
  "status": "ok",
  "service": "avaliaedu-omr",
  "version": "0.1.0",
  "opencv_available": true,
  "pyzbar_available": true
}
```

Se tudo funcionar, você tem sucesso! ✅

---

## 📤 Enviar para Git

```bash
# 1. Adicionar todos os arquivos
git add .

# 2. Fazer commit
git commit -m "Setup: Add Railway deployment configuration"

# 3. Enviar para GitHub
git push origin main
```

---

## 🎯 Resumo do que foi feito

| O quê | Como | Por quê |
|------|------|--------|
| `requirements.txt` | Adicionado `python-dotenv` | Carregar variáveis |
| `runtime.txt` | Criado com `python-3.11.7` | Railway saber qual Python |
| `Dockerfile` | Já existia | Container do servidor |
| `.env.example` | Criado | Template de config |
| `.gitignore` | Criado | Proteger `.env` |
| `main.py` | Modificado | Suportar variáveis |
| Servidor | Configurado | Rodar em `0.0.0.0:8000` |

---

## 🚨 Erros Comuns

### Erro: "ModuleNotFoundError: No module named 'dotenv'"
**Solução**: 
```bash
pip install python-dotenv
```

### Erro: "Port 8000 already in use"
**Solução**:
```bash
PORT=8001 python main.py
```

### Erro: "Connection refused"
**Solução**: Verifique se tem `host="0.0.0.0"` no código. **Nunca use `localhost`**.

---

## 📚 Próximo Passo

Quando tiver sucesso nos testes:

**Passo 3**: Criar conta no https://railway.app

Depois disso, o Railway fará deploy automático!

---

## 💡 Dicas

1. **Sempre teste localmente primeiro** - Evita problemas no Railway
2. **Verifique os logs** - Railway mostra todos os erros
3. **Variáveis de ambiente** - Nunca coloque senhas no código
4. **CORS** - Se o frontend não conseguir chamar, problema é CORS

---

## 📞 Precisa de ajuda?

- Veja `PASSO-1-E-2-RAILWAY.md` para detalhes
- Veja `ESTRUTURA-PASSOS-1-E-2.md` para visualizar arquivos
- Execute `python test_server.py` para testar tudo

