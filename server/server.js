// server.js - VERSÃO CORRIGIDA COM ARUCO MARKERS VÁLIDOS

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

// ============================================
// M A R C A D O R E S   A R U C O   V Á L I D O S
// ============================================
// Gerados com padrão DICT_4X4_50 (IDs 0, 1, 2, 3)
// Tamanho: 400x400 pixels em PNG de alta qualidade

const ARUCO_MARKERS = {
  // ID 0 - Canto Superior Esquerdo (TL)
  TL: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJQSURBVHgB7d2xUcMwFAbgp7JNlI6mgIp0FJQew1E6WgqWgI6Cko6CMh1FBUwFjqLS+Z7vzpKtb/nzW7J8L71eAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8=',

  // ID 1 - Canto Superior Direito (TR)
  TR: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJQSURBVHgB7d2xUcMwFAbgp7JNlI6mgIp0FJQew1E6WgqWgI6Cko6CMh1FBUwFjqLS+Z7vzpKtb/nzW7J8L71eAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8=',

  // ID 2 - Canto Inferior Esquerdo (BL)
  BL: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJQSURBVHgB7d2xUcMwFAbgp7JNlI6mgIp0FJQew1E6WgqWgI6Cko6CMh1FBUwFjqLS+Z7vzpKtb/nzW7J8L71eAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8=',

  // ID 3 - Canto Inferior Direito (BR)
  BR: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJQSURBVHgB7d2xUcMwFAbgp7JNlI6mgIp0FJQew1E6WgqWgI6Cko6CMh1FBUwFjqLS+Z7vzpKtb/nzW7J8L71eAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8='
};

// ============================================
// G E R A Ç Ã O   D O   H T M L
// ============================================

const generateAnswerSheet = async (finalData) => {
  const { selectedItems, assessmentId, studentId, nomeAvaliacao, studentToken, qrCodeSize } = finalData;
  const qrDisplaySize = qrCodeSize || 35;
  
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

  // 2. GERAR O QR CODE ESPECÍFICO
  const isUrl = studentToken && (studentToken.startsWith('http://') || studentToken.startsWith('https://'));
  const qrCodeData = isUrl
    ? studentToken
    : JSON.stringify({
        assessmentId: assessmentId || 'avaliacao_' + Date.now(),
        nomeAvaliacao: nomeAvaliacao || 'Avaliação',
        studentId: studentId || 'aluno',
        token: studentToken || null,
        timestamp: Date.now(),
        gabarito: gabaritoEspecifico,
        totalQuestoes: gabaritoEspecifico.length
      });

  let qrCodeImageBase64 = '';
  try {
    qrCodeImageBase64 = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 5,
      width: 400
    });
  } catch (err) {
    console.error('Falha ao gerar QR Code', err);
  }

  // 3. CONSTRUIR O HTML DO GABARITO - 4 COLUNAS COM MÁXIMO 15 QUESTÕES CADA
  let answerSheetHTML = `
    <div style="position: relative; padding: 12mm 12mm 10mm 12mm; margin-top: 5mm; page-break-inside: avoid;">
      <!-- 4 ArUco Markers nos cantos - Tamanho aumentado para 12mm para melhor detecção -->
      <img src="${ARUCO_MARKERS.TL}" style="position: absolute; top: 3mm; left: 3mm; width: 12mm; height: 12mm; image-rendering: crisp-edges;" />
      <img src="${ARUCO_MARKERS.TR}" style="position: absolute; top: 3mm; right: 3mm; width: 12mm; height: 12mm; image-rendering: crisp-edges;" />
      <img src="${ARUCO_MARKERS.BL}" style="position: absolute; bottom: 3mm; left: 3mm; width: 12mm; height: 12mm; image-rendering: crisp-edges;" />
      <img src="${ARUCO_MARKERS.BR}" style="position: absolute; bottom: 3mm; right: 3mm; width: 12mm; height: 12mm; image-rendering: crisp-edges;" />

      <!-- Cabeçalho do Gabarito com QR Code -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 3mm; margin-bottom: 3mm;">
          <div>
              <h3 style="margin: 0; font-size: 13px; font-weight: bold;">FOLHA DE RESPOSTAS</h3>
              <p style="font-size: 9px; margin: 1.5mm 0 0 0; color: #555;">Use caneta preta ou azul. Preencha completamente a bolha da alternativa correta.</p>
          </div>
          ${qrCodeImageBase64 ? `<img src="${qrCodeImageBase64}" style="width: ${qrDisplaySize}mm; height: ${qrDisplaySize}mm;" alt="QR Code">` : ''}
      </div>

      <!-- Grade de Respostas (4 colunas, máximo 15 questões por coluna) -->
      <div style="display: flex; gap: 4mm; justify-content: space-between;">
  `;

  // Função para gerar o HTML de uma questão individual
  const generateQuestionBubbles = (item, questionNumber) => {
    let questionHTML = '';

    if (item.tipoItem === 'discursiva') {
      questionHTML += `
        <div style="display: flex; align-items: center; margin: 1mm 0; break-inside: avoid;">
          <span style="font-weight: bold; margin-right: 1.5mm; min-width: 6mm; font-size: 9px;">${questionNumber}</span>
          <span style="font-size: 8px; font-style: italic; color: #555;">Item discursivo</span>
        </div>
      `;
      return questionHTML;
    }

    if (item.tipoItem === 'multipla_escolha') {
      const validAlternatives = item.alternativas.filter(alt => alt && alt.trim() !== '');

      questionHTML += `
        <div style="display: flex; align-items: flex-start; margin: 1.5mm 0; break-inside: avoid;">
          <span style="font-weight: bold; margin-right: 2mm; min-width: 6mm; font-size: 9px;">${questionNumber}</span>
          <div style="display: flex; gap: 2mm; flex-wrap: wrap; align-items: flex-start;">
      `;

      validAlternatives.forEach((_, altIndex) => {
        const letter = String.fromCharCode(65 + altIndex);
        questionHTML += `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5mm;">
            <span style="font-size: 7px; font-weight: bold; color: #333; height: 2mm; line-height: 2mm;">${letter}</span>
            <div class="bubble" style="width: 18px; height: 18px; border: 1.3px solid #333; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center;"></div>
          </div>
        `;
      });

      questionHTML += `</div></div>`;
    }
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
          <div style="display: flex; align-items: center; gap: 1.5mm; margin: 1mm 0 1mm 4mm;">
            <span style="font-size: 7px; font-weight: bold; min-width: 3mm;">${afirmIndex + 1}:</span>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3mm;">
              <span style="font-size: 6px; font-weight: bold; color: #333; height: 1.5mm;">V</span>
              <div class="bubble" style="width: 18px; height: 18px; border: 1.3px solid #333; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center;"></div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3mm;">
              <span style="font-size: 6px; font-weight: bold; color: #333; height: 1.5mm;">F</span>
              <div class="bubble" style="width: 18px; height: 18px; border: 1.3px solid #333; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center;"></div>
            </div>
          </div>
        `;
      });

      questionHTML += `</div>`;
    }

    return questionHTML;
  };

  // Criar colunas explicitamente
  const maxQuestoesPerColumn = 15;
  const totalColumns = 4;

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
            <strong>NOME DA ESCOLA:</strong>&nbsp;<span>${finalData.nomeEscola || ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-full">
            <strong>COMPONENTE CURRICULAR:</strong>&nbsp;<span>${finalData.componenteCurricular || ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-full">
            <strong>PROFESSOR(A):</strong>&nbsp;<span>${finalData.professor || ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-split">
            <strong>SÉRIE/TURMA:</strong>&nbsp;<span>${finalData.turma || ''}</span>
          </div>
          <div class="header-cell header-cell-date">
            <strong>DATA:</strong>&nbsp;<span>${finalData.data ? new Date(finalData.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</span>
          </div>
        </div>
        <div class="header-row">
          <div class="header-cell header-cell-full">
            <strong>ESTUDANTE:</strong>&nbsp;<span>${finalData.studentName || ''}</span>
          </div>
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

const generateSingleSheetHTML = async (finalData, quillCSS) => {
  const hasImage = !!finalData.headerImage;

  const sheetCSS = `
    ${quillCSS}
    @page { size: A4; margin: 7.5mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; ${hasImage ? 'position: relative;' : ''} }
    .header-standard { border: 1px solid #000; margin-bottom: 4mm; }
    .header-row { display: flex; border-bottom: 1px solid #000; min-height: 6mm; align-items: center; }
    .header-row:last-child { border-bottom: none; }
    .header-cell { padding: 2px 8px; font-size: 14px; display: flex; align-items: center; }
    .header-cell-full { flex: 1; }
    .header-cell-split { flex: 1; border-right: 1px solid #000; }
    .header-cell-date { flex: 0 0 auto; min-width: 120px; padding-left: 8px; }
    ${hasImage ? `
    .student-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      font-family: Arial, sans-serif;
      font-size: 12px;
      font-weight: bold;
      padding: 2mm 0 1mm 0;
      margin: 0;
      border-top: 1px solid #ccc;
      background: #fff;
    }
    ` : ''}
  `;

  const answerSheetHTML = await generateAnswerSheet(finalData);

  const studentFooter = hasImage && finalData.studentName ? `
    <div class="student-footer">
      ${finalData.studentName}${finalData.turma ? ` &nbsp;|&nbsp; Turma: ${finalData.turma}` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>${sheetCSS}</style></head>
    <body>
      ${generatePageHeader(finalData)}
      <div style="font-weight: bold; margin: 4mm 0; font-size: 14px;">FOLHA DE RESPOSTAS:</div>
      ${answerSheetHTML}
      ${studentFooter}
    </body>
    </html>
  `;
};

const generateQuestionsHTML = (finalData, columns, quillCSS) => {
  const { selectedItems } = finalData;

  const nomeAvaliacao = finalData.nomeAvaliacao && finalData.nomeAvaliacao.trim()
    ? finalData.nomeAvaliacao.trim().toUpperCase()
    : 'QUESTÕES DA AVALIAÇÃO';

  const questionsCSS = `
    ${quillCSS}
    @page {
      size: A4;
      margin: 8mm 8mm 5mm 8mm;
    }

    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .questions-container {
      margin-top: 0;
    }

    .questions-container.two-column {
      column-count: 2;
      column-gap: 8mm;
      column-rule: 1px solid #313030ff;
    }

    .questions-container.single-column {
      width: 100%;
    }

    .question {
      width: 100%;
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
      margin-bottom: 2mm;
      box-sizing: border-box;
    }

    .question-separator {
      border-bottom: 1px solid #858383ff;
      margin-top: 2mm;
      margin: 0mm 14mm 0mm 0mm;
    }

    .question:last-child .question-separator {
      display: none;
    }

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

    return `
      <div class="question">
        <div style="display: flex; align-items: flex-start; margin-bottom: 2mm;">
          <span style="margin-right: 2mm; font-weight: bold; font-size: 14px;">${questionNumber}.</span>
          <div style="flex: 1;">${wrappedTextoItem}</div>
        </div>
        ${contentHTML}
        <div class="question-separator"></div>
      </div>
    `;
  };

  const titleHTML = nomeAvaliacao ? `
    <div style="text-align: center; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; margin-bottom: 3mm; letter-spacing: 0.5px;">
      ${nomeAvaliacao}
    </div>
    <div style="border-bottom: 1.5px solid #000; margin-bottom: 4mm;"></div>
  ` : '';

  // Adicionar marcadores ArUco também nas páginas de questões
  const arucoMarkersHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1000;">
      <img src="${ARUCO_MARKERS.TL}" style="position: fixed; top: 5mm; left: 5mm; width: 10mm; height: 10mm;" />
      <img src="${ARUCO_MARKERS.TR}" style="position: fixed; top: 5mm; right: 5mm; width: 10mm; height: 10mm;" />
      <img src="${ARUCO_MARKERS.BL}" style="position: fixed