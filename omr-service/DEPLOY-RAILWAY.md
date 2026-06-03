# Deploy do Servico OMR no Railway

O servico OMR e uma API Python (FastAPI) para leitura de gabaritos por visao computacional. Este guia explica como deployar no Railway sem precisar configurar o Root Directory manualmente.

---

## Por que nao e necessario configurar Root Directory

O repositorio agora tem um `Dockerfile` e um `railway.json` na raiz que instruem o Railway a:
1. Usar Docker (ignorando o Railpack/Nixpacks que causava o erro)
2. Copiar os arquivos corretos da pasta `omr-service/`
3. Iniciar o servidor na porta certa automaticamente

Basta seguir os passos abaixo.

---

## Parte 1 — Deploy no Railway

### Passo 1: Criar conta e novo projeto

1. Acesse [https://railway.app](https://railway.app)
2. Faca login com sua conta do GitHub
3. Clique em **New Project**
4. Selecione **Deploy from GitHub repo**
5. Escolha o repositorio do AvaliaEdu

### Passo 2: Aguardar o build

O Railway vai detectar o `railway.json` e o `Dockerfile` na raiz e comecar o build automaticamente. Nao e necessario nenhuma configuracao adicional.

O build demora entre **5 e 10 minutos** na primeira vez por causa das dependencias do OpenCV (biblioteca de visao computacional).

Para acompanhar:
1. Clique no servico criado
2. Va em **Deployments**
3. Clique no deploy em andamento para ver os logs ao vivo

Aguarde ate aparecer nos logs:
```
Application startup complete.
```

### Passo 3: Gerar a URL publica

1. Clique no servico no painel do Railway
2. Va em **Settings**
3. Role ate a secao **Networking**
4. Clique em **Generate Domain**
5. Uma URL sera gerada no formato:
   ```
   https://nome-do-projeto-xxxx.up.railway.app
   ```
6. **Copie essa URL** — voce vai precisar dela no proximo passo

### Passo 4: Verificar se funcionou

Abra no navegador:
```
https://SUA-URL-AQUI.up.railway.app/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "avaliaedu-omr",
  "version": "0.3.0",
  "opencv_available": true,
  "pyzbar_available": true
}
```

---

## Parte 2 — Configurar a URL no Vercel

O app precisa saber onde esta o servico OMR em producao. Isso e feito via variavel de ambiente no Vercel.

### Passo 1: Abrir as variaveis de ambiente

1. Acesse [https://vercel.com](https://vercel.com)
2. Abra o projeto do AvaliaEdu
3. Va em **Settings** → **Environment Variables**

### Passo 2: Adicionar a variavel

Clique em **Add New** e preencha:

| Campo | Valor |
|-------|-------|
| **Name** | `VITE_OMR_SERVICE_URL` |
| **Value** | `https://SUA-URL-AQUI.up.railway.app` |
| **Environments** | Production, Preview, Development (marque os tres) |

> Cole a URL copiada do Railway. Nao coloque barra `/` no final.

Clique em **Save**.

### Passo 3: Forcar novo deploy no Vercel

A variavel so tem efeito em builds novos:

1. Va em **Deployments** no painel do Vercel
2. Clique nos tres pontos ao lado do deploy mais recente
3. Clique em **Redeploy**
4. Aguarde ~2 minutos

---

## Parte 3 — Testar

1. Abra o app no celular
2. Escaneie o QR code de uma folha de respostas
3. Tire a foto do gabarito
4. Clique em **Processar Gabarito**
5. O resultado deve aparecer em alguns segundos

---

## Solucao de Problemas

### Build falhou — erro no Docker

Va em **Deployments** no Railway → clique no deploy falhado → veja os logs completos.

Causas mais comuns:
- Timeout durante instalacao do OpenCV (normal em maquinas menores)
  - Solucao: clique em **Redeploy** — geralmente funciona na segunda tentativa
- Erro de permissao no apt-get
  - Solucao: aguarde alguns minutos e tente redeploy

### "Servico de leitura de gabaritos nao esta acessivel" no app

1. Confirme que o servico no Railway esta com status **Active**
2. Acesse `/api/health` para verificar se responde
3. Confirme que `VITE_OMR_SERVICE_URL` esta correto no Vercel (sem `/` no final)
4. Confirme que o Vercel foi redeployado apos adicionar a variavel

### `opencv_available: false` no health check

O OpenCV nao foi instalado corretamente durante o build. Tente:
1. No Railway, va em **Deployments**
2. Clique em **Redeploy**

### Railway pausou o servico

O plano gratuito tem 500 horas/mes. Se o servico pausar:
1. Va no painel do Railway
2. Clique em **Resume** no servico

Para uso continuo sem interrupcao, considere o plano Hobby (US$ 5/mes).

---

## Atualizacoes Futuras

Qualquer push no GitHub atualiza o servico no Railway automaticamente. Nao e necessaria nenhuma acao manual.
