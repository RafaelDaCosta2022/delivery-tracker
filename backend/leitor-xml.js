const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const axios = require('axios');
const chokidar = require('chokidar');

// === CONFIGURAÇÃO ===
const pastaBase = 'C:\\Program Files\\GManager\\nfe\\arquivos\\procNFe';
const API_URL = 'http://192.168.15.17:3000/upload-nota'; // ajuste seu IP se necessário

function getPastaAtual() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return path.join(pastaBase, `${ano}${mes}`);
}

async function processarXML(filePath) {
  try {
    const xml = fs.readFileSync(filePath, 'utf8');
    const json = await xml2js.parseStringPromise(xml, { explicitArray: false });

    const nfeProc = json.nfeProc;
    if (!nfeProc || !nfeProc.NFe || !nfeProc.NFe.infNFe) {
      console.log(`⚠️ XML ignorado (estrutura inválida): ${filePath}`);
      return;
    }

    const nfe = nfeProc.NFe.infNFe;
    const nota = nfe.ide.nNF;
    const cliente = nfe.dest.xNome;
    const cnpj = nfe.dest.CNPJ || '';
    const dataEmissao = nfe.ide.dhEmi?.substring(0, 10);
    const valorTotal = parseFloat(nfe.total.ICMSTot.vNF || 0);
    const remetente = nfeProc.protNFe?.infProt?.xNome || 'Remetente';

    console.log(`📤 Enviando nota ${nota} - ${cliente}...`);

    await axios.post(API_URL, {
      nota,
      cliente,
      cnpj,
      dataEmissao,
      total: valorTotal,
      remetente,
      vendedor: '',
      motorista: '',
      observacao: '',
      status: 'PENDENTE',
    });

    moverParaProcessado(filePath);
    console.log(`✅ Nota ${nota} enviada e movida.`);
  } catch (err) {
    console.error('❌ Erro ao processar XML:', err.message);
  }
}

function moverParaProcessado(origem) {
  const dir = path.dirname(origem);
  const destinoDir = path.join(dir, 'processado');
  if (!fs.existsSync(destinoDir)) fs.mkdirSync(destinoDir);

  const nomeArquivo = path.basename(origem);
  const destino = path.join(destinoDir, nomeArquivo);

  fs.renameSync(origem, destino);
}

function iniciarMonitoramento() {
  const pasta = getPastaAtual();
  if (!fs.existsSync(pasta)) {
    console.log(`❌ Pasta ${pasta} não encontrada.`);
    return;
  }

  console.log(`👀 Monitorando pasta: ${pasta}`);

  const watcher = chokidar.watch(pasta, {
    ignored: /^\./,
    persistent: true,
    depth: 0,
    awaitWriteFinish: true,
  });

  watcher.on('add', (filePath) => {
    if (filePath.endsWith('.xml')) {
      processarXML(filePath);
    }
  });
}

iniciarMonitoramento();
