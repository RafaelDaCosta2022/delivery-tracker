const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const mysql = require('mysql2/promise');

const pastaRaizXML = 'C:/Program Files/GManager/nfe/arquivos/procNFe';

const CNPJS_PERMITIDOS = [
  '32921928000103', // Expressão
  '00352451000198', // Casa da Apicultura
];

function getSafe(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : '', obj);
}

function buscarTodosXMLs(diretorio) {
  let arquivos = [];
  const itens = fs.readdirSync(diretorio);
  for (const item of itens) {
    const caminho = path.join(diretorio, item);
    const stats = fs.statSync(caminho);
    if (stats.isDirectory()) {
      arquivos = arquivos.concat(buscarTodosXMLs(caminho));
    } else if (caminho.toLowerCase().endsWith('.xml')) {
      arquivos.push(caminho);
    }
  }
  arquivos.sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);
  return arquivos;
}

async function importarNotasXML(db) {
  const arquivosXML = buscarTodosXMLs(pastaRaizXML);
  let inseridas = 0, ignoradas = 0;

  for (const xmlPath of arquivosXML) {
    try {
      const xml = fs.readFileSync(xmlPath, 'utf-8');
      const dados = await xml2js.parseStringPromise(xml, { explicitArray: false });

      const nota = getSafe(dados, 'nfeProc.NFe.infNFe.ide.nNF');
      const cliente = getSafe(dados, 'nfeProc.NFe.infNFe.dest.xNome');
      const cnpj_dest = getSafe(dados, 'nfeProc.NFe.infNFe.dest.CNPJ');
      const cidade = getSafe(dados, 'nfeProc.NFe.infNFe.dest.enderDest.xMun');
      const endereco = getSafe(dados, 'nfeProc.NFe.infNFe.dest.enderDest.xLgr') + ', ' +
                       getSafe(dados, 'nfeProc.NFe.infNFe.dest.enderDest.nro');
      const cep = getSafe(dados, 'nfeProc.NFe.infNFe.dest.enderDest.CEP');
      const tipoFrete = getSafe(dados, 'nfeProc.NFe.infNFe.transp.modFrete');
      const pesoBruto = getSafe(dados, 'nfeProc.NFe.infNFe.transp.vol.pesoB');
      const numeroPedido = getSafe(dados, 'nfeProc.NFe.infNFe.ide.nFref');
      const dataEmissao = getSafe(dados, 'nfeProc.NFe.infNFe.ide.dhEmi') || getSafe(dados, 'nfeProc.NFe.infNFe.ide.dEmi');
      const total = getSafe(dados, 'nfeProc.NFe.infNFe.total.ICMSTot.vNF');
      const remetente = getSafe(dados, 'nfeProc.NFe.infNFe.emit.xNome');
      const remetente_cnpj = getSafe(dados, 'nfeProc.NFe.infNFe.emit.CNPJ');

      if (!CNPJS_PERMITIDOS.includes(remetente_cnpj)) {
        ignoradas++;
        continue;
      }

      if (!nota || !cliente || !dataEmissao || !total || !remetente_cnpj) continue;

      const [existe] = await db.execute(
        'SELECT id FROM entregas WHERE nota=? AND remetente_cnpj=?',
        [nota, remetente_cnpj]
      );
      if (existe.length > 0) continue;

      await db.execute(
        `INSERT INTO entregas (
          nota, cliente_nome, cliente_cnpj, cidade, endereco, cep,
          tipo_frete, peso_bruto, numero_pedido,
          data_emissao, valor_total, remetente_nome, remetente_cnpj, xml_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nota,
          cliente,
          cnpj_dest,
          cidade,
          endereco,
          cep,
          tipoFrete,
          pesoBruto,
          numeroPedido,
          dataEmissao ? dataEmissao.slice(0, 10) : null,
          total,
          remetente,
          remetente_cnpj,
          xmlPath
        ]
      );
      inseridas++;
      console.log(`✅ [IMPORTADA] Nota ${nota} | ${remetente} | ${cidade}`);
    } catch (err) {
      console.error(`❌ Erro ao importar ${xmlPath}: ${err.message}`);
    }
  }

  console.log(`\n🔵 Notas inseridas: ${inseridas} | Ignoradas: ${ignoradas}`);
}

async function executarUnico() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'deliverytracker',
  });

  await importarNotasXML(db);
  await db.end();
}

executarUnico();
