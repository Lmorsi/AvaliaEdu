// Script para verificar o ambiente e dependências

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando ambiente do servidor PDF...\n');

// 1. Verificar versão do Node.js
console.log('📦 Node.js:', process.version);
console.log('📦 npm:', process.env.npm_config_user_agent?.split(' ')[0] || 'unknown');

// 2. Verificar variáveis de ambiente
console.log('\n🔧 Variáveis de ambiente:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'não definido');
console.log('   PORT:', process.env.PORT || '3001 (padrão)');
console.log('   PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH || 'não definido');
console.log('   CHROME_BIN:', process.env.CHROME_BIN || 'não definido');

// 3. Verificar dependências
console.log('\n📚 Verificando dependências...');
const requiredModules = ['express', 'cors', 'puppeteer', 'qrcode', 'pdf-lib', 'react-quill'];
requiredModules.forEach(module => {
  try {
    const version = require(`${module}/package.json`).version;
    console.log(`   ✅ ${module}: ${version}`);
  } catch (error) {
    console.log(`   ❌ ${module}: NÃO INSTALADO`);
  }
});

// 4. Verificar Puppeteer e Chrome
console.log('\n🌐 Verificando Puppeteer e Chrome...');
(async () => {
  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
                          process.env.CHROME_BIN ||
                          '/usr/bin/google-chrome-stable';

    console.log('   Caminho do Chrome:', executablePath);

    // Verificar se o executável existe
    if (fs.existsSync(executablePath)) {
      console.log('   ✅ Executável do Chrome encontrado');
    } else {
      console.log('   ⚠️  Executável não encontrado no caminho especificado');
      console.log('   ℹ️  Puppeteer tentará usar o Chrome empacotado');
    }

    // Tentar iniciar o Puppeteer
    console.log('\n🚀 Testando inicialização do Puppeteer...');
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: fs.existsSync(executablePath) ? executablePath : undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    console.log('   ✅ Puppeteer iniciado com sucesso!');

    const version = await browser.version();
    console.log('   Versão do Chrome:', version);

    await browser.close();
    console.log('   ✅ Browser fechado corretamente');

    console.log('\n✅ TODAS AS VERIFICAÇÕES PASSARAM!');
    console.log('🎉 O servidor está pronto para funcionar!\n');

  } catch (error) {
    console.log('\n❌ ERRO ao verificar Puppeteer:');
    console.log('   ', error.message);
    console.log('\n💡 Possíveis soluções:');
    console.log('   1. Instalar Chrome: npx puppeteer browsers install chrome');
    console.log('   2. Verificar se o Chrome está instalado no sistema');
    console.log('   3. Usar Docker para garantir ambiente consistente\n');
    process.exit(1);
  }
})();
