# Deploy do Servico OMR no Railway

O servico OMR e uma API Python (FastAPI) responsavel por ler as respostas das folhas de gabarito atraves de visao computacional. Este guia explica como colocar esse servico em producao no Railway para que o aplicativo mobile funcione sem depender de um servidor local.

---

## Parte 1 — Deploy no Railway

### Passo 1: Criar conta e novo projeto

1. Acesse [https://railway.app](https://railway.app)
2. Faca login com sua conta do GitHub
3. Clique em **New Project**
4. Selecione **Deploy from GitHub repo**
5. Escolha o repositorio `avaliaedu` (ou o nome que voce usa)

### Passo 2: Configurar o Root Directory

Apos o Railway detectar o repositorio, ele vai tentar construir a partir da raiz. Como o servico OMR esta dentro da pasta `omr-service`, e preciso configurar isso:

1. Clique no servico criado no painel
2. Va em **Settings** (engrenagem)
3. Encontre a secao **Source**
4. Em **Root Directory**, digite: `omr-service`
5. Clique em **Save**
6. O Railway vai iniciar um novo deploy automaticamente (~3 a 5 minutos)

> O Railway vai detectar o `Dockerfile` dentro de `omr-service/` e usar ele para construir a imagem Docker com Python, OpenCV e todas as dependencias.

### Passo 3: Acompanhar o build

1. Va em **Deployments** no painel do servico
2. Clique no deploy em andamento para ver os logs
3. Aguarde aparecer a mensagem:
   ```
   Application started. Listening on 0.0.0.0:XXXXX
   ```
4. O primeiro build demora entre 3 e 8 minutos por causa das dependencias do OpenCV

### Passo 4: Gerar a URL publica

1. Ainda no painel do servico, va em **Settings**
2. Role ate a secao **Networking**
3. Clique em **Generate Domain**
4. Aguarde alguns segundos — uma URL sera gerada no formato:
   ```
   https://omr-service-xxxx.up.railway.app
   ```
5. **Copie essa URL** — voce vai precisar dela no proximo passo

### Passo 5: Verificar se funcionou

Abra o navegador e acesse:
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

Se `opencv_available` ou `pyzbar_available` estiver `false`, verifique os logs do deploy.

---

## Parte 2 — Configurar a URL no Frontend (Vercel)

O aplicativo precisa saber qual e a URL do servico OMR em producao. Isso e feito atraves de uma variavel de ambiente no Vercel.

### Passo 1: Acessar as variaveis de ambiente no Vercel

1. Acesse [https://vercel.com](https://vercel.com)
2. Abra o projeto do AvaliaEdu
3. Va em **Settings** → **Environment Variables**

### Passo 2: Adicionar a variavel

Clique em **Add New** e preencha:

| Campo | Valor |
|-------|-------|
| Name  | `VITE_OMR_SERVICE_URL` |
| Value | `https://SUA-URL-AQUI.up.railway.app` |
| Environments | Production, Preview, Development |

> Substitua `SUA-URL-AQUI` pela URL gerada no Railway (sem barra no final).

### Passo 3: Forcar um novo deploy no Vercel

A variavel so vale em builds novos. Para aplicar:

1. Va em **Deployments** no Vercel
2. Clique nos tres pontos ao lado do deploy mais recente
3. Selecione **Redeploy**
4. Aguarde o deploy concluir (~2 minutos)

---

## Parte 3 — Testar

1. Abra o aplicativo no celular
2. Escaneie o QR code de uma folha de respostas
3. Tire a foto do gabarito
4. Clique em **Processar Gabarito**
5. O resultado das respostas deve aparecer em alguns segundos

---

## Solucao de Problemas

### "Servico de leitura de gabaritos nao esta acessivel"

- Verifique se o servico no Railway esta com status **Active** (nao pausado)
- Acesse `/api/health` para confirmar que esta respondendo
- Confirme que `VITE_OMR_SERVICE_URL` esta corretamente configurado no Vercel (sem barra final)
- Confirme que o Vercel foi redeployado apos adicionar a variavel

### Build falhou no Railway

- Va em **Deployments** → clique no deploy falhado → veja os logs
- Causa mais comum: dependencias do sistema (`libzbar0`, `libgl1`) nao instaladas
  - O Dockerfile ja cuida disso — se falhar, copie o erro completo para diagnostico

### OpenCV nao disponivel no health check

- Significa que o build do Docker nao instalou o `opencv-contrib-python-headless` corretamente
- Tente disparar um novo deploy clicando em **Redeploy** no Railway

### Railway pausou o servico (plano gratuito)

- O plano gratuito do Railway tem 500 horas/mes
- Se o servico estiver pausado, va no painel e clique em **Resume**
- Para uso continuo, considere o plano Hobby ($5/mes)

---

## Atualizacoes Futuras

Sempre que voce fizer push de alteracoes na pasta `omr-service/` no GitHub, o Railway detecta automaticamente e faz um novo deploy. Nao e necessario nenhuma acao manual.
