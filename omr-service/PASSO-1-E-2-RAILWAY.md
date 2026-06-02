# Guia Completo: Passo 1 e 2 para Deploy no Railway

## O que você precisa entender

O Railway é uma plataforma de hospedagem na nuvem que roda seus projetos em **containers Docker**. Seu servidor Python (FastAPI) será empacotado em um container e rodará 24/7 na nuvem.

---

## PASSO 1: Preparar as Dependências Python

### O que é `requirements.txt`?

É um arquivo de texto que lista **todas as bibliotecas Python** que seu projeto precisa para rodar. Quando você faz deploy no Railway, ele lê esse arquivo e instala tudo automaticamente.

### Arquivos necessários:

Você já tem criados:

```
✓ requirements.txt      → Lista todas as dependências
✓ runtime.txt          → Define versão do Python (3.11.7)
✓ Dockerfile           → Instruções para criar o container
✓ .env.example         → Exemplo de variáveis de ambiente
✓ .gitignore           → Arquivos que não devem ir para Git
```

### O que cada arquivo faz:

#### 1. **requirements.txt**
```
fastapi==0.115.5                              # Framework web
uvicorn[standard]==0.32.1                     # Servidor HTTP
python-multipart==0.0.12                      # Upload de arquivos
opencv-contrib-python-headless>=4.10.0.84     # Processamento de imagens
imutils==0.5.4                                # Utilitários OpenCV
pyzbar==0.1.9                                 # Leitura de QR code
numpy>=2.0.0                                  # Operações numéricas
pydantic==2.9.2                               # Validação de dados
pillow>=11.0.0                                # Manipulação de imagens
python-dotenv==1.0.0                          # Carregar variáveis .env
```

#### 2. **runtime.txt**
```
python-3.11.7
```
Isso diz ao Railway: "Use Python 3.11.7"

#### 3. **Dockerfile**
```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**O que faz:**
- `FROM python:3.12-slim` → Começa com imagem Python mínima
- `apt-get install` → Instala dependências do sistema (OpenCV precisa disso)
- `COPY requirements.txt` → Copia arquivo de dependências
- `RUN pip install` → Instala pacotes Python
- `COPY . .` → Copia todo o código da aplicação
- `EXPOSE 8000` → Abre porta 8000
- `CMD [...]` → Comando para iniciar o servidor

#### 4. **.env.example**
```
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,https://seu-site.com
LOG_LEVEL=INFO
ENVIRONMENT=production
```

**Para usar:**
1. Copie para `.env` (local, não vai para Git)
2. Configure conforme necessário

#### 5. **.gitignore**
Arquivos que **NÃO** devem ser enviados para Git:
- `__pycache__/` → Cache Python
- `.env` → Senhas e chaves
- `venv/` → Ambiente virtual

---

## PASSO 2: Configurar o Servidor Python

### O que foi modificado no `main.py`:

```python
# 1. Importar dotenv
from dotenv import load_dotenv

# 2. Carregar variáveis de ambiente
load_dotenv()

# 3. Usar variáveis de ambiente
log_level = os.getenv("LOG_LEVEL", "INFO")
port = int(os.getenv("PORT", 8000))
environment = os.getenv("ENVIRONMENT", "development")

# 4. Configurar CORS corretamente
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# 5. Adicionar inicialização do servidor
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",      # IMPORTANTE: Aceita conexões de fora
        port=port,
        reload=(environment == "development"),
    )
```

### Por que `host="0.0.0.0"`?

- `127.0.0.1` = Apenas sua máquina pode acessar
- `0.0.0.0` = Qualquer pessoa na internet pode acessar

No Railway, **DEVE ser `0.0.0.0`**.

### Variáveis de Ambiente no Railway

Quando você faz deploy, o Railway permite configurar variáveis sem editar código:

```
Dashboard Railway → Seu projeto → Variables

PORT=8000
ALLOWED_ORIGINS=https://seu-frontend.vercel.app,https://seu-servidor.railway.app
ENVIRONMENT=production
LOG_LEVEL=INFO
```

---

## PASSO 3: Testar Localmente (Antes de Deploy)

### 1. Criar ambiente virtual
```bash
cd omr-service
python -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate
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

Você verá:
```
INFO     Starting OMR server on port 8000 (development)
INFO     Uvicorn running on http://0.0.0.0:8000
```

### 5. Testar endpoints
```bash
# Health check
curl http://localhost:8000/api/health

# Deve retornar:
{
  "status": "ok",
  "service": "avaliaedu-omr",
  "version": "0.1.0",
  "opencv_available": true,
  "pyzbar_available": true
}
```

---

## PASSO 4: Preparar para Git

```bash
# Adicionar arquivos
git add .
git commit -m "Setup: Add requirements, runtime, Dockerfile for Railway deployment"

# Enviar para GitHub
git push origin main
```

---

## Checklist - Passo 1 e 2 Completos

- ✅ `requirements.txt` com todas as dependências
- ✅ `runtime.txt` com Python 3.11.7
- ✅ `Dockerfile` configurado
- ✅ `.env.example` criado
- ✅ `.gitignore` criado
- ✅ `main.py` suporta variáveis de ambiente
- ✅ `host="0.0.0.0"` no servidor
- ✅ Testado localmente
- ✅ Enviado para Git

---

## Próximos Passos (Passos 3+)

Depois que os Passos 1 e 2 estiverem prontos:

- **Passo 3**: Criar conta no Railway
- **Passo 4**: Conectar repositório GitHub ao Railway
- **Passo 5**: Railway fará deploy automaticamente

Qualquer dúvida em um passo específico, me avise!
