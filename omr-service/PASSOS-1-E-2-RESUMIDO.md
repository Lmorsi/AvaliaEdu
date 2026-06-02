# Passos 1 e 2 - Resumo Simplificado

## PASSO 1: As 5 Coisas Essenciais

Você precisa de **5 arquivos** na pasta `omr-service`:

### 1️⃣ `requirements.txt` ✅ (JÁ EXISTE)
```
fastapi==0.115.5
uvicorn[standard]==0.32.1
python-multipart==0.0.12
opencv-contrib-python-headless>=4.10.0.84
imutils==0.5.4
pyzbar==0.1.9
numpy>=2.0.0
pydantic==2.9.2
pillow>=11.0.0
python-dotenv==1.0.0
```
**O que é**: Lista todas as bibliotecas que o servidor precisa.

---

### 2️⃣ `runtime.txt` ✅ (CRIADO)
```
python-3.11.7
```
**O que é**: Define qual versão do Python usar.

---

### 3️⃣ `Dockerfile` ✅ (CRIADO)
```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```
**O que é**: Receita para criar o container do servidor.

---

### 4️⃣ `.env.example` ✅ (CRIADO)
```
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,https://seu-site.com
LOG_LEVEL=INFO
ENVIRONMENT=production
```
**O que é**: Exemplo de variáveis que o servidor precisa.

---

### 5️⃣ `.gitignore` ✅ (CRIADO)
```
__pycache__/
*.pyc
.env
venv/
```
**O que é**: Arquivos que não devem ir para Git.

---

## PASSO 2: Configurar o Servidor Python

### Modificações feitas no `main.py`:

#### ✅ Adicionar no topo:
```python
from dotenv import load_dotenv
load_dotenv()
```

#### ✅ Usar variáveis de ambiente:
```python
port = int(os.getenv("PORT", 8000))
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
log_level = os.getenv("LOG_LEVEL", "INFO")
```

#### ✅ CORS configurado:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
```

#### ✅ Servidor iniciado com `host="0.0.0.0"`:
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",        # IMPORTANTE: Ser acessível pela internet
        port=port,
        reload=False,
    )
```

---

## ✅ Verificar Localmente

### 1. Ativar ambiente virtual
```bash
cd omr-service
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

### 2. Instalar dependências
```bash
pip install -r requirements.txt
```

### 3. Criar arquivo `.env`
```bash
cp .env.example .env
```

### 4. Rodar servidor
```bash
python main.py
```

### 5. Testar em outro terminal
```bash
# Opção 1: Script
python test_server.py

# Opção 2: cURL
curl http://localhost:8000/api/health

# Opção 3: Browser
http://localhost:8000/docs
```

---

## 📋 Checklist Final

- ✅ `requirements.txt` com `python-dotenv==1.0.0` adicionado
- ✅ `runtime.txt` existe com `python-3.11.7`
- ✅ `Dockerfile` existe
- ✅ `.env.example` existe
- ✅ `.gitignore` existe
- ✅ `main.py` importa e carrega `dotenv`
- ✅ `main.py` usa `os.getenv()` para variáveis
- ✅ Servidor roda com `host="0.0.0.0"`
- ✅ Testado localmente com sucesso
- ✅ Pronto para Git

---

## ⚠️ Possíveis Problemas

### "ModuleNotFoundError: No module named 'dotenv'"
```bash
pip install python-dotenv
```

### "Port already in use"
A porta 8000 já está sendo usada. Faça:
```bash
python main.py --port 8001
# ou
PORT=8001 python main.py
```

### "Connection refused"
Certifique-se que `host="0.0.0.0"` está no código. **NÃO USE `localhost`**.

---

## Próximo: Passo 3

Quando os Passos 1 e 2 estiverem prontos, você faz:

```bash
git add .
git commit -m "Setup: Docker and Railway deployment files"
git push origin main
```

Depois você vai para o **Passo 3: Criar Conta no Railway**.
