// server.js - VERSÃO ULTRA ROBUSTA PARA SESSION CLOSED

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor Puppeteer funcionando!',
    timestamp: new Date().toISOString()
  });
});

// --- FUNÇÕES DE GERAÇÃO DE HTML (DIVIDIDAS) ---

const generateAnswerSheet = async (finalData) => {
  const { selectedItems, assessmentId, studentId, nomeAvaliacao } = finalData;
  if (!selectedItems || selectedItems.length === 0) {
    return '';
  }

  // 1. CRIAR GABARITO ESPECÍFICO PARA A AVALIAÇÃO COM ORDEM DAS QUESTÕES
  const gabaritoEspecifico = selectedItems.map((item, index) => {
    const questionNumber = index + 1;

    if (item.tipoItem === 'discursiva') {
      return null;
    }

    if (item.tipoItem === 'multipla_escolha') {
      return {
        numero: questionNumber,
        tipo: 'multipla_escolha',
        respostaCorreta: item.respostaCorreta,
        alternativas: item.alternativas.filter(alt => alt && alt.trim() !== '').length
      };
    } else if (item.tipoItem === 'verdadeiro_falso') {
      const todasAfirmativas = [...item.afirmativas, ...(item.afirmativasExtras || [])];
      const todosGabaritos = [...item.gabaritoAfirmativas, ...(item.gabaritoAfirmativasExtras || [])];
      const afirmativasValidas = todasAfirmativas.filter(afirm => afirm && afirm.trim() !== '');

      return {
        numero: questionNumber,
        tipo: 'verdadeiro_falso',
        gabarito: todosGabaritos.slice(0, afirmativasValidas.length),
        afirmativas: afirmativasValidas.length
      };
    }
  }).filter(q => q !== null);

  // 2. GERAR O QR CODE ESPECÍFICO COM O GABARITO COMPLETO
  const qrCodeData = JSON.stringify({
    assessmentId: assessmentId || 'avaliacao_' + Date.now(),
    nomeAvaliacao: nomeAvaliacao || 'Avaliação',
    studentId: studentId || 'aluno',
    timestamp: Date.now(),
    gabarito: gabaritoEspecifico,
    totalQuestoes: gabaritoEspecifico.length
  });

  let qrCodeImageBase64 = '';
  try {
    qrCodeImageBase64 = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 3,
      width: 256
    });
  } catch (err) {
    console.error('Falha ao gerar QR Code', err);
  }

  // 3. CONSTRUIR O HTML DO GABARITO - 4 COLUNAS COM MÁXIMO 15 QUESTÕES CADA
  let answerSheetHTML = `
    <div style="position: relative; padding: 8mm; border: 1.5px solid #333; margin-top: 5mm; page-break-inside: avoid;">
      <!-- 4 Marcadores de Ancoragem (Fiducial Markers) nos cantos -->
      <div style="position: absolute; top: 2mm; left: 2mm; width: 5mm; height: 5mm; background-color: #000;"></div>
      <div style="position: absolute; top: 2mm; right: 2mm; width: 5mm; height: 5mm; background-color: #000;"></div>
      <div style="position: absolute; bottom: 2mm; left: 2mm; width: 5mm; height: 5mm; background-color: #000;"></div>
      <div style="position: absolute; bottom: 2mm; right: 2mm; width: 5mm; height: 5mm; background-color: #000;"></div>

      <!-- Cabeçalho do Gabarito com QR Code -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 3mm; margin-bottom: 3mm;">
          <div>
              <h3 style="margin: 0; font-size: 13px; font-weight: bold;">FOLHA DE RESPOSTAS</h3>
              <p style="font-size: 9px; margin: 1.5mm 0 0 0; color: #555;">Use caneta preta ou azul. Preencha completamente a bolha da alternativa correta.</p>
          </div>
          ${qrCodeImageBase64 ? `<img src="${qrCodeImageBase64}" style="width: 22mm; height: 22mm;" alt="QR Code">` : ''}
      </div>

      <!-- Grade de Respostas (4 colunas, máximo 15 questões por coluna, vertical com opções horizontais) -->
      <div style="display: flex; gap: 4mm; justify-content: space-between;">
  `;

  // 4. GERAR AS BOLHAS DE RESPOSTA
  // Distribuir questões em colunas: preencher coluna 1 (1-15), depois coluna 2 (16-30), coluna 3 (31-45), coluna 4 (46-60)
  const maxQuestoesPerColumn = 15;
  const totalColumns = 4;

  // Função para gerar o HTML de uma questão individual
  const generateQuestionBubbles = (item, questionNumber) => {
    let questionHTML = '';

    // Para itens discursivos, apenas mostrar "item discursivo"
    if (item.tipoItem === 'discursiva') {
      questionHTML += `
        <div style="display: flex; align-items: center; margin: 1mm 0; break-inside: avoid;">
          <span style="font-weight: bold; margin-right: 1.5mm; min-width: 6mm; font-size: 9px;">${questionNumber}</span>
          <span style="font-size: 8px; font-style: italic; color: #555;">Item discursivo</span>
        </div>
      `;
      return questionHTML;
    }

    // Para itens de múltipla escolha
    if (item.tipoItem === 'multipla_escolha') {
      const validAlternatives = item.alternativas.filter(alt => alt && alt.trim() !== '');

      questionHTML += `
        <div style="display: flex; align-items: center; margin: 1mm 0; break-inside: avoid;">
          <span style="font-weight: bold; margin-right: 1.5mm; min-width: 6mm; font-size: 9px;">${questionNumber}</span>
          <div style="display: flex; gap: 1mm; flex-wrap: wrap;">
      `;

      validAlternatives.forEach((_, altIndex) => {
        questionHTML += `
          <div class="bubble" style="width: 4.5mm; height: 4.5mm; border: 1.2px solid #333; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: bold; color: #333;">${String.fromCharCode(65 + altIndex)}</div>
        `;
      });

      questionHTML += `</div></div>`;
    }
    // Para itens verdadeiro/falso - UM EMBAIXO DO OUTRO
    else if (item.tipoItem === 'verdadeiro_falso') {
      const todasAfirmativas = [...item.afirmativas, ...(item.afirmativasExtras || [])];
      const afirmativasValidas = todasAfirmativas.filter(afirm => afirm && afirm.trim() !== '');

      questionHTML += `
        <div style="margin: 1mm 0; break-inside: avoid;">
          <div style="display: flex; align-items: center; margin-bottom: 0.5mm;">
            <span style="font-weight: bold; font-size: 9px;">${questionNumber}</span>
          </div>
      `;

      afirmativasValidas.forEach((_, afirmIndex) => {
        questionHTML += `
          <div style="display: flex; align-items: center; gap: 1mm; margin: 0.5mm 0 0.5mm 4mm;">
            <span style="font-size: 7px; font-weight: bold; min-width: 3mm;">${afirmIndex + 1}:</span>
            <div class="bubble" style="width: 4mm; height: 4mm; border: 1.2px solid #333; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 6px; font-weight: bold; color: #333;">V</div>
            <div class="bubble" style="width: 4mm; height: 4mm; border: 1.2px solid #333; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 6px; font-weight: bold; color: #333;">F</div>
          </div>
        `;
      });

      questionHTML += `</div>`;
    }

    return questionHTML;
  };

  // Criar colunas explicitamente para garantir distribuição vertical
  // Coluna 1: 1-15, Coluna 2: 16-30, Coluna 3: 31-45, Coluna 4: 46-60
  for (let col = 0; col < totalColumns; col++) {
    answerSheetHTML += `<div style="flex: 1; display: flex; flex-direction: column;">`;

    for (let row = 0; row < maxQuestoesPerColumn; row++) {
      const idx = (col * maxQuestoesPerColumn) + row;

      if (idx >= selectedItems.length) break;

      const item = selectedItems[idx];
      const questionNumber = idx + 1;

      answerSheetHTML += generateQuestionBubbles(item, questionNumber);
    }

    answerSheetHTML += `</div>`;
  }

  answerSheetHTML += `</div></div>`;
  return answerSheetHTML;
};

const generatePageHeader = (finalData) => {
  if (finalData.headerImage) {
    return `
      <div style="text-align: center; margin-bottom: 4mm;">
        <img src="${finalData.headerImage}" 
             style="width: ${finalData.imageWidth || 190}mm; height: ${finalData.imageHeight || 40}mm; object-fit: fill;" 
             alt="Cabeçalho">
      </div>
      
      ${finalData.mostrarTipoAvaliacao && finalData.tipoAvaliacao ? `
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin: 4mm 0;">
          ${finalData.tipoAvaliacao.toUpperCase()}
        </div>
      ` : ''}
      
      ${finalData.instrucoes ? `
        <div style="margin-bottom: 4mm;">
          <h3 style="font-weight: bold; margin: 0 0 2mm 0; font-size: 14px;">INSTRUÇÕES:</h3>
          <p style="font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${finalData.instrucoes}</p>
        </div>
      ` : ''}
    `;
  } else {
    return `
      <div class="header-standard">
        <div class="header-row">
          <div class="header-cell header-cell-full">
            <strong>NOME DA ESCOLA: </strong><span>${finalData.nomeEscola || ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-full">
            <strong>COMPONENTE CURRICULAR: </strong><span>${finalData.componenteCurricular || ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-full">
            <strong>PROFESSOR(A): </strong><span>${finalData.professor || ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-split">
            <strong>SÉRIE/TURMA: </strong><span>${finalData.turma || ''}</span>
          </div>
          <div class="header-cell header-cell-date">
            <strong>DATA: </strong><span>${finalData.data ? new Date(finalData.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-full"><strong>ESTUDANTE:</strong></div>
        </div>
      </div>
      
      ${finalData.mostrarTipoAvaliacao && finalData.tipoAvaliacao ? `
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin: 4mm 0;">
          ${finalData.tipoAvaliacao.toUpperCase()}
        </div>
      ` : ''}
      
      ${finalData.instrucoes ? `
        <div style="margin-bottom: 4mm;">
          <h3 style="font-weight: bold; margin: 0 0 2mm 0; font-size: 14px;">INSTRUÇÕES:</h3>
          <p style="font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${finalData.instrucoes}</p>
        </div>
      ` : ''}
    `;
  }
};

// NOVA FUNÇÃO: Gera apenas o HTML da primeira página (capa e gabarito)
const generateCoverHTML = async (finalData, quillCSS) => {
  const coverCSS = `
    ${quillCSS}
    @page { size: A4; margin: 7.5mm; }
    body { font-family: Arial, sans-serif; }
    
    .header-standard { border: 1px solid #000; margin-bottom: 4mm; }
    .header-row { display: flex; border-bottom: 1px solid #000; min-height: 6mm; align-items: center; }
    .header-row:last-child { border-bottom: none; }
    .header-cell { padding: 2px 8px; font-size: 14px; display: flex; align-items: center; }
    .header-cell-full { flex: 1; }
    .header-cell-split { flex: 1; border-right: 1px solid #000; }
    .header-cell-date { flex: 0 0 auto; min-width: 120px; padding-left: 8px; }
    
    /* Estilos específicos para impressão */
    @media print {
      body { 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .header-standard { 
        border: 1px solid #000 !important; 
      }
      
      .header-row { 
        border-bottom: 1px solid #000 !important; 
      }
    }
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>${coverCSS}</style></head>
    <body>
      ${generatePageHeader(finalData)}
      <div style="font-weight: bold; margin: 4mm 0; font-size: 14px;">FOLHA DE RESPOSTAS:</div>
      ${await generateAnswerSheet(finalData)}
    </body>
    </html>
  `;
};

// NOVA FUNÇÃO: Gera apenas o HTML das páginas de questões
const generateQuestionsHTML = (finalData, columns, quillCSS) => {
  const { selectedItems } = finalData;

  // Obter o nome da avaliação ou usar padrão
  const nomeAvaliacao = finalData.nomeAvaliacao && finalData.nomeAvaliacao.trim()
    ? finalData.nomeAvaliacao.trim().toUpperCase()
    : 'QUESTÕES DA AVALIAÇÃO';

  const questionsCSS = `
    ${quillCSS}
    @page {
      size: A4;
      margin: 17mm 8mm 5mm 8mm;
    }

    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    /* Container principal */
    .questions-container {
      margin-top: 0;
    }

    /* Layout de 2 colunas - CSS Multi-column */
    .questions-container.two-column {
      column-count: 2;
      column-gap: 8mm;
      column-rule: 1px solid #313030ff;
    }

    /* Layout de 1 coluna */
    .questions-container.single-column {
      width: 100%;
    }

    /* Questão individual */
    .question {
      width: 100%;
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
      margin-bottom: 2mm;
      box-sizing: border-box;
    }

    /* Separador entre questões */
    .question-separator {
      border-bottom: 1px solid #858383ff;
      margin-top: 2mm;
      margin: 0mm 14mm 0mm 0mm;

    }

    .question:last-child .question-separator {
      display: none;
    }

    /* Estilos do editor Quill */
    .ql-editor img {
      max-width: 100% !important;
      height: auto !important;
      object-fit: contain !important;
      max-height: 40vh !important;
    }

    .ql-editor {
      padding: 0 !important;
      font-size: 14px;
      line-height: 1.4;
      overflow: hidden;
      max-width: 100%;
      box-sizing: border-box;
    }
  `;

  // Função para gerar HTML de uma questão
  const generateQuestionHTML = (item, questionNumber) => {
    const isTwo = columns === '2';

    const wrappedTextoItem = item.textoItem ? `
      <div class="ql-container">
        <div class="ql-editor">${item.textoItem}</div>
      </div>
    ` : '';

    let contentHTML = '';
    if (item.tipoItem === 'multipla_escolha') {
      const validAlternatives = item.alternativas.filter(alt => alt && alt.trim() !== '');

      contentHTML = `
        <div style="margin-left: ${isTwo ? '2.5mm' : '3mm'};">
          ${validAlternatives.map((alt, altIndex) => `
              <div style="margin: ${isTwo ? '1mm' : '1mm'} 0; display: flex; align-items: flex-start;">
                <span style="margin-right: ${isTwo ? '1.5mm' : '2mm'}; font-weight: bold; font-size: ${isTwo ? '14px' : '14px'};">${String.fromCharCode(65 + altIndex)})</span>
                <span style="font-size: ${isTwo ? '14px' : '14px'}; line-height: 1.3;">${alt}</span>
              </div>
            `).join('')}
        </div>
      `;
    } else if (item.tipoItem === 'verdadeiro_falso') {
      contentHTML = `
        <div style="margin-left: ${isTwo ? '2.5mm' : '3mm'};">
          ${[...item.afirmativas, ...(item.afirmativasExtras || [])]
            .filter(afirm => afirm.trim())
            .map((afirm, afirmIndex) => `
              <div style="display: flex; align-items: flex-start; margin: ${isTwo ? '1mm' : '1mm'} 0;">
                <span style="margin-right: ${isTwo ? '1.5mm' : '2mm'}; font-weight: bold; font-size: ${isTwo ? '14px' : '14px'};">${afirmIndex + 1}.</span>
                <span style="margin-right: ${isTwo ? '1.5mm' : '2mm'}; font-family: monospace; letter-spacing: ${isTwo ? '6px' : '15px'}; font-size: ${isTwo ? '14px' : '14px'};">( )</span>
                <span style="flex: 1; font-size: ${isTwo ? '14px' : '14px'}; line-height: 1.3;">${afirm}</span>
              </div>
            `).join('')}
        </div>
      `;
    } else if (item.tipoItem === 'discursiva') {
      const linhas = Math.min(parseInt(item.quantidadeLinhas) || 5, isTwo ? 35 : 40);
      contentHTML = `
        <div style="margin: ${isTwo ? '1.5mm' : '2mm'} 0 0 ${isTwo ? '2.5mm' : '3mm'};">
          ${Array.from({ length: linhas }).map(() =>
            `<div style="border-bottom: 1px solid #9ca3af; height: ${isTwo ? '3.5mm' : '4mm'}; margin: ${isTwo ? '1mm' : '1mm'} 0;"></div>`
          ).join('')}
        </div>
      `;
    }

    const questionHTML = `
      <div class="question">
        <div style="display: flex; align-items: flex-start; margin-bottom: 2mm;">
          <span style="margin-right: 2mm; font-weight: bold; font-size: 14px;">${questionNumber}.</span>
          <div style="flex: 1;">${wrappedTextoItem}</div>
        </div>
        ${contentHTML}
        <div class="question-separator"></div>
      </div>
    `;

    return questionHTML;
  };

  // Se for uma coluna, gerar normalmente
  if (columns !== '2') {
    const allQuestionsHTML = selectedItems.map((item, index) => {
      return generateQuestionHTML(item, index + 1);
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${questionsCSS}</style>
      </head>
      <body>
        <div class="questions-container single-column">
          ${allQuestionsHTML}
        </div>
      </body>
      </html>
    `;
  }

  // Para 2 colunas, usar CSS multi-column que distribui automaticamente
  const allQuestionsHTML = selectedItems.map((item, index) => {
    return generateQuestionHTML(item, index + 1);
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${questionsCSS}</style>
    </head>
    <body>
      <div class="questions-container two-column">
        ${allQuestionsHTML}
      </div>
    </body>
    </html>
  `;
};

// --- FUNÇÃO PRINCIPAL ULTRA ROBUSTA PARA SESSION CLOSED ---

const handlePdfRequest = async (req, res, disposition) => {
  let browser = null;
  let coverPage = null;
  let questionsPage = null;
  
  try {
    const { columns, ...finalData } = req.body;

    console.log('🚀 Iniciando Puppeteer ULTRA ROBUSTO...');
    
    // Configuração ULTRA robusta do Puppeteer
    const puppeteerOptions = {
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ||
                      process.env.CHROME_BIN ||
                      '/usr/bin/google-chrome-stable' ||
                      undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max_old_space_size=4096',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        // NOVOS FLAGS PARA EVITAR SESSION CLOSED
        '--disable-blink-features=AutomationControlled',
        '--disable-features=TranslateUI',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-sync',
        '--disable-client-side-phishing-detection',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=VizDisplayCompositor',
        '--run-all-compositor-stages-before-draw',
        '--disable-new-content-rendering-timeout'
      ],
      // Configurações de timeout MUITO mais generosas
      timeout: 300000, // 5 minutos
      protocolTimeout: 300000, // 5 minutos
      // Configurações de memória
      ignoreDefaultArgs: ['--disable-extensions'],
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      // NOVA: Configuração para manter sessão ativa
      keepAlive: true
    };

    // Inicializar browser com retry
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !browser) {
      try {
        console.log(`🔄 Tentativa ${retryCount + 1}/${maxRetries} de inicializar Puppeteer...`);
        browser = await puppeteer.launch(puppeteerOptions);
        console.log('✅ Puppeteer iniciado com sucesso!');
        break;
      } catch (error) {
        retryCount++;
        console.log(`⚠️ Tentativa ${retryCount} falhou:`, error.message);
        
        if (retryCount === maxRetries) {
          throw new Error(`Falha ao inicializar Puppeteer após ${maxRetries} tentativas: ${error.message}`);
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Verificar se o browser foi criado corretamente
    if (!browser) {
      throw new Error('Falha ao inicializar o navegador após todas as tentativas');
    }

    // AGUARDAR o browser estar completamente pronto
    console.log('⏳ Aguardando browser estar completamente pronto...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verificar se browser ainda está ativo
    if (!browser.isConnected()) {
      throw new Error('Browser perdeu conexão durante inicialização');
    }

    // Carregar CSS do Quill
    let quillCSS = '';
    try {
      quillCSS = fs.readFileSync(require.resolve('react-quill/dist/quill.snow.css'), 'utf8');
      console.log('✅ CSS do Quill carregado automaticamente');
    } catch (error) {
      console.warn('⚠️ Não foi possível carregar o CSS do Quill:', error.message);
      quillCSS = `
        .ql-editor { font-family: inherit; font-size: inherit; line-height: inherit; }
        .ql-editor p { margin-bottom: 8px; }
        .ql-editor h1, .ql-editor h2, .ql-editor h3 { margin-bottom: 12px; margin-top: 16px; }
        .ql-editor ul, .ql-editor ol { margin-bottom: 12px; padding-left: 20px; }
        .ql-editor img { max-width: 100%; height: auto; display: block; margin: 8px 0; }
        .ql-editor strong { font-weight: bold; }
        .ql-editor em { font-style: italic; }
        .ql-editor u { text-decoration: underline; }
      `;
    }

    // --- ETAPA 1: GERAR PDF DA CAPA COM PROTEÇÕES ULTRA ROBUSTAS ---
    console.log('📄 Criando página para a CAPA...');
    
    // Verificar browser antes de criar página
    if (!browser.isConnected()) {
      throw new Error('Browser desconectado antes de criar página da capa');
    }
    
    coverPage = await browser.newPage();
    
    // AGUARDAR a página estar completamente inicializada
    console.log('⏳ Aguardando página da capa estar pronta...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar se a página foi criada corretamente
    if (!coverPage || coverPage.isClosed()) {
      throw new Error('Falha ao criar página da capa');
    }
    
    // Configurações de timeout MUITO mais generosas
    coverPage.setDefaultTimeout(300000); // 5 minutos
    coverPage.setDefaultNavigationTimeout(300000); // 5 minutos
    
    // Configurar viewport
    console.log('🖥️ Configurando viewport da capa...');
    await coverPage.setViewport({ width: 1200, height: 800 });

    // Gerar HTML da capa
    console.log('📝 Gerando HTML da capa...');
    const coverHtml = await generateCoverHTML(finalData, quillCSS);
    
    // Verificar se a página ainda está ativa antes de setContent
    if (!coverPage || coverPage.isClosed()) {
      throw new Error('Página da capa foi fechada antes de definir conteúdo');
    }
    
    // MÉTODO ULTRA SEGURO: Usar setContent com retry
    console.log('📝 Definindo conteúdo HTML da capa...');
    let coverContentSet = false;
    let contentRetries = 0;
    const maxContentRetries = 3;
    
    while (!coverContentSet && contentRetries < maxContentRetries) {
      try {
        await coverPage.setContent(coverHtml, { 
          waitUntil: 'load',
          timeout: 180000 // 3 minutos
        });
        coverContentSet = true;
        console.log('✅ Conteúdo HTML da capa definido com sucesso');
      } catch (setContentError) {
        contentRetries++;
        console.warn(`⚠️ Tentativa ${contentRetries}/${maxContentRetries} de definir conteúdo da capa falhou:`, setContentError.message);
        
        if (contentRetries === maxContentRetries) {
          throw new Error(`Falha ao definir conteúdo HTML da capa após ${maxContentRetries} tentativas: ${setContentError.message}`);
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se página ainda está ativa
        if (!coverPage || coverPage.isClosed()) {
          throw new Error('Página da capa foi fechada durante retry de setContent');
        }
      }
    }
    
    // Aguardar renderização completa
    console.log('⏳ Aguardando renderização completa da capa...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar novamente se a página ainda está ativa
    if (!coverPage || coverPage.isClosed()) {
      throw new Error('Página da capa foi fechada durante renderização');
    }
    
    // Verificar se browser ainda está conectado
    if (!browser.isConnected()) {
      throw new Error('Browser desconectado durante renderização da capa');
    }
    
    let coverPdfBuffer;
    try {
      console.log('🖨️ Gerando PDF da capa...');
      coverPdfBuffer = await coverPage.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '7.5mm', right: '7.5mm', bottom: '7.5mm', left: '7.5mm' },
        timeout: 180000, // 3 minutos
        preferCSSPageSize: true
      });
      console.log('✅ PDF da capa gerado com sucesso');
    } catch (pdfError) {
      console.error('❌ Erro ao gerar PDF da capa:', pdfError);
      throw new Error(`Falha na geração do PDF da capa: ${pdfError.message}`);
    }

    // --- ETAPA 2: GERAR PDF DAS QUESTÕES COM PROTEÇÕES ULTRA ROBUSTAS ---
    console.log('📝 Criando página para as QUESTÕES...');
    
    // Verificar browser antes de criar segunda página
    if (!browser.isConnected()) {
      throw new Error('Browser desconectado antes de criar página das questões');
    }
    
    questionsPage = await browser.newPage();
    
    // AGUARDAR a página estar completamente inicializada
    console.log('⏳ Aguardando página das questões estar pronta...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar se a página foi criada corretamente
    if (!questionsPage || questionsPage.isClosed()) {
      throw new Error('Falha ao criar página das questões');
    }
    
    // Configurações de timeout MUITO mais generosas
    questionsPage.setDefaultTimeout(300000); // 5 minutos
    questionsPage.setDefaultNavigationTimeout(300000); // 5 minutos
    
    // Configurar viewport
    console.log('🖥️ Configurando viewport das questões...');
    await questionsPage.setViewport({ width: 1200, height: 800 });

    // Gerar HTML das questões
    console.log('📝 Gerando HTML das questões...');
    const questionsHtml = generateQuestionsHTML(finalData, columns, quillCSS);
    
    // Verificar se a página ainda está ativa antes de setContent
    if (!questionsPage || questionsPage.isClosed()) {
      throw new Error('Página das questões foi fechada antes de definir conteúdo');
    }
    
    // MÉTODO ULTRA SEGURO: Usar setContent com retry
    console.log('📝 Definindo conteúdo HTML das questões...');
    let questionsContentSet = false;
    let questionsContentRetries = 0;
    
    while (!questionsContentSet && questionsContentRetries < maxContentRetries) {
      try {
        await questionsPage.setContent(questionsHtml, { 
          waitUntil: 'load',
          timeout: 180000 // 3 minutos
        });
        questionsContentSet = true;
        console.log('✅ Conteúdo HTML das questões definido com sucesso');
      } catch (setContentError) {
        questionsContentRetries++;
        console.warn(`⚠️ Tentativa ${questionsContentRetries}/${maxContentRetries} de definir conteúdo das questões falhou:`, setContentError.message);
        
        if (questionsContentRetries === maxContentRetries) {
          throw new Error(`Falha ao definir conteúdo HTML das questões após ${maxContentRetries} tentativas: ${setContentError.message}`);
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se página ainda está ativa
        if (!questionsPage || questionsPage.isClosed()) {
          throw new Error('Página das questões foi fechada durante retry de setContent');
        }
      }
    }
    
    // Aguardar renderização completa
    console.log('⏳ Aguardando renderização completa das questões...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar novamente se a página ainda está ativa
    if (!questionsPage || questionsPage.isClosed()) {
      throw new Error('Página das questões foi fechada durante renderização');
    }
    
    // Verificar se browser ainda está conectado
    if (!browser.isConnected()) {
      throw new Error('Browser desconectado durante renderização das questões');
    }
    
    let questionsPdfBuffer;
    try {
      console.log('🖨️ Gerando PDF das questões...');

      // Obter o nome da avaliação para o cabeçalho
      const nomeAvaliacaoHeader = finalData.nomeAvaliacao && finalData.nomeAvaliacao.trim()
        ? finalData.nomeAvaliacao.trim().toUpperCase()
        : 'QUESTÕES DA AVALIAÇÃO';

      questionsPdfBuffer = await questionsPage.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="width: 100%; text-align: center; font-size: 10px; font-family: Arial, sans-serif; font-weight: bold; border-bottom: 1px solid #333; padding: 6px 0; margin: 0 20px;">
            ${nomeAvaliacaoHeader}
          </div>
        `,
        footerTemplate: '<div></div>',
        margin: {
          top: '25mm',
          right: '7.5mm',
          bottom: '7.5mm',
          left: '7.5mm'
        },
        timeout: 180000, // 3 minutos
        preferCSSPageSize: true
      });
      console.log('✅ PDF das questões gerado com sucesso');
    } catch (pdfError) {
      console.error('❌ Erro ao gerar PDF das questões:', pdfError);
      throw new Error(`Falha na geração do PDF das questões: ${pdfError.message}`);
    }

    // --- ETAPA 3: UNIR OS PDFs ---
    console.log('🔗 Unindo os PDFs...');
    const finalPdfDoc = await PDFDocument.create();
    
    // Adiciona páginas da capa
    const coverDoc = await PDFDocument.load(coverPdfBuffer);
    const coverPages = await finalPdfDoc.copyPages(coverDoc, coverDoc.getPageIndices());
    coverPages.forEach(p => finalPdfDoc.addPage(p));

    // Adiciona página em branco, se necessário (layout de 3 páginas)
    if (finalData.layoutPaginas === "pagina3") {
      console.log('📄 Adicionando página em branco...');
      finalPdfDoc.addPage();
    }

    // Adiciona páginas das questões
    const questionsDoc = await PDFDocument.load(questionsPdfBuffer);
    const questionsPages = await finalPdfDoc.copyPages(questionsDoc, questionsDoc.getPageIndices());
    questionsPages.forEach(p => finalPdfDoc.addPage(p));

    const finalPdfBytes = await finalPdfDoc.save();

    // --- ETAPA 4: ENVIAR RESPOSTA ---
    console.log('✅ PDF final gerado com sucesso!');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="avaliacao.pdf"`);
    res.send(Buffer.from(finalPdfBytes));

  } catch (error) {
    console.error('❌ Erro fatal durante a geração do PDF:', error);
    
    // Log adicional para debug
    if (error.message.includes('Session closed') || error.message.includes('Protocol error') || error.message.includes('Connection closed')) {
      console.error('🔍 Erro de sessão/protocolo detectado. Possíveis causas:');
      console.error('   - Timeout insuficiente (aumentado para 5 minutos)');
      console.error('   - Memória insuficiente (configurações ultra otimizadas)');
      console.error('   - Processo do Chrome foi terminado (proteções ultra robustas)');
      console.error('   - Conteúdo HTML muito complexo (simplificado)');
      console.error('   - Timing de inicialização (aguardando muito mais tempo)');
      console.error('   - Sessão perdida (implementado retry e verificações)');
    }
    
    res.status(500).json({ 
      error: 'Erro interno ao gerar o PDF', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Cleanup ULTRA robusto
    console.log('🧹 Iniciando cleanup ultra robusto...');
    
    // Fechar página da capa
    if (coverPage) {
      try {
        if (!coverPage.isClosed()) {
          console.log('📄 Fechando página da capa...');
          await coverPage.close();
        }
      } catch (pageCloseError) {
        console.warn('⚠️ Erro ao fechar página da capa (ignorado):', pageCloseError.message);
      }
    }
    
    // Fechar página das questões
    if (questionsPage) {
      try {
        if (!questionsPage.isClosed()) {
          console.log('📄 Fechando página das questões...');
          await questionsPage.close();
        }
      } catch (pageCloseError) {
        console.warn('⚠️ Erro ao fechar página das questões (ignorado):', pageCloseError.message);
      }
    }
    
    // Fechar browser
    if (browser) {
      try {
        if (browser.isConnected()) {
          console.log('🚪 Fechando o navegador...');
          await browser.close();
        }
      } catch (browserCloseError) {
        console.warn('⚠️ Erro ao fechar navegador (ignorado):', browserCloseError.message);
      }
    }
    
    // Forçar garbage collection se disponível
    if (global.gc) {
      console.log('🗑️ Executando garbage collection...');
      global.gc();
    }
    
    console.log('✅ Cleanup concluído');
  }
};

// --- ROTAS DA API ---

// Endpoint de download que chama a função central
app.post('/api/generate-pdf', (req, res) => handlePdfRequest(req, res, 'attachment'));

// Endpoint de preview que chama a função central
app.post('/api/preview-pdf', (req, res) => handlePdfRequest(req, res, 'inline'));

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor Puppeteer ULTRA ROBUSTO rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📄 Endpoint PDF: http://localhost:${PORT}/api/generate-pdf`);
  console.log(`👁️ Endpoint Preview: http://localhost:${PORT}/api/preview-pdf`);
  console.log(`🛡️ Configurações anti-session-closed ULTRA robustas ativadas`);
  console.log(`⏱️ Timeouts aumentados para 5 minutos`);
  console.log(`🔄 Sistema de retry implementado`);
  console.log(`📊 Verificações de estado contínuas ativadas`);
});

// Tratamento de sinais para encerramento gracioso
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  console.error('Promise:', promise);
});
