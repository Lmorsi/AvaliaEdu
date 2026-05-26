# OMR Service Setup & Troubleshooting

## Status: ✓ Online and Working

O serviço Python OMR (detecção de marcadores L, QR, bolhas) está operacional.

## Como Iniciar

### Opção 1: Instalação Rápida (Recomendado)

```bash
# Instalar dependências
pip install --break-system-packages opencv-python-headless fastapi uvicorn python-multipart pyzbar numpy pillow

# Iniciar serviço (do diretório do projeto)
python3 -m uvicorn omr-service.main:app --host 0.0.0.0 --port 8000
```

### Opção 2: Virtual Environment

```bash
cd omr-service
python3 -m venv .venv
source .venv/bin/activate    # Linux/Mac
# .venv\Scripts\activate     # Windows
pip install -r requirements.txt
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Teste a Conexão

### Via Browser
```bash
# Terminal 1: Iniciar serviço OMR
python3 -m uvicorn omr-service.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Servir arquivos estáticos
python3 -m http.server 3000

# Browser: http://localhost:3000/omr-service/test_scan.html
```

### Via cURL
```bash
curl http://127.0.0.1:8000/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "service": "avaliaedu-omr",
  "version": "0.1.0",
  "opencv_available": true,
  "pyzbar_available": true
}
```

## O que Mudou

1. **main.py**: Adicionada rota `/api/health` (além de `/health`) com informações completas
2. **fiducial.py**: Melhorado sistema de detecção de L-markers
   - Extração de pontos de canto interno (não centroide)
   - Uso de defects de convexidade para precisão
   - Resultado melhor para homografia/perspectiva

3. **README.md**: Instruções claras de setup

## Endpoints Disponíveis

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/health` | GET | Health check com status de dependências |
| `/health` | GET | Health check simples |
| `/api/omr/scan` | POST | Processar foto da folha (QR + fiduciais + bolhas) |
| `/docs` | GET | Swagger UI (documentação interativa) |

## Se Ainda Tiver Problemas

### ImportError: No module named 'cv2'
```bash
pip install --break-system-packages opencv-python-headless
```

### Connection refused
Verifique se o serviço está rodando:
```bash
lsof -i :8000    # Linux/Mac
netstat -ano | findstr :8000  # Windows
```

### Porta 8000 ocupada
Use outra porta:
```bash
python3 -m uvicorn omr-service.main:app --host 0.0.0.0 --port 9000
```
(Depois atualize a URL em `test_scan.html`)

## Arquivos Importantes

- **main.py**: Servidor FastAPI com rotas
- **omr/fiducial.py**: Detecção de marcadores L (NOVO: extração de cantos)
- **omr/qr_reader.py**: Leitura de QR code
- **omr/bubble.py**: Detecção de bolhas de resposta
- **omr/perspective.py**: Correção de perspectiva usando homografia
- **test_scan.html**: Interface web para testar o serviço
- **test_bubbles.html**: Debug dos marcadores L detectados
