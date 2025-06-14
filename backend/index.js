// backend.js (com filtros, exportação, atribuição protegida e nota sem zeros à esquerda)
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const mime = require('mime-types');
const app = express();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // mantém a extensão
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

const SECRET = 'seuSegredoJWT123';
const path = require('path');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));




const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'deliverytracker',
});

db.connect((err) => {
  if (err) return console.error('❌ Erro ao conectar ao banco de dados:', err);
  console.log('✅ Conectado ao banco de dados MySQL');
});

const autenticar = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    const decodificado = jwt.verify(token, SECRET);
    req.usuario = decodificado;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

app.post('/login', (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });

  if (nome === 'admin' && senha === 'SENHAMASTER123') {
    const token = jwt.sign({ id: 0, nome: 'admin', tipo: 'admin' }, SECRET, { expiresIn: '1d' });
    return res.json({ id: 0, nome: 'admin', tipo: 'admin', token });
  }

  db.query('SELECT * FROM usuarios WHERE nome = ?', [nome], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar usuário' });
    if (results.length === 0) return res.status(400).json({ error: 'Usuário não encontrado' });

    const usuario = results[0];
    const senhaValida = senha === usuario.senha || bcrypt.compareSync(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo, nome: usuario.nome }, SECRET, { expiresIn: '1d' });
    res.json({ token, ...usuario });
  });
});

app.post('/cadastro', (req, res) => {
  const { nome, senha, tipo } = req.body;
  if (!nome || !senha || !tipo) return res.status(400).json({ error: 'Preencha todos os campos' });

  const senhaCriptografada = bcrypt.hashSync(senha, 8);
  db.query(
    'INSERT INTO usuarios (nome, senha, tipo) VALUES (?, ?, ?)',
    [nome, senhaCriptografada, tipo],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Usuário já existe' });
        return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
      }
      res.json({ success: true, userId: result.insertId });
    }
  );
});

app.post('/upload-nota', async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return res.status(400).json({ error: 'Tipo de conteúdo inválido. Apenas JSON é aceito.' });
    }

    // Pega todos os campos possíveis enviados
    const {
      nota,
      cliente, // nome do cliente
      cnpj,
      dataEmissao,
      total,
      remetente,
      xml_path,
      pdf_path
    } = req.body;

    // Valida só os campos realmente obrigatórios
    if (!nota || !cliente || !dataEmissao || !total) {
      console.error('[UPLOAD-NOTA] Dados incompletos:', req.body);
      return res.status(400).json({ error: 'Dados incompletos para salvar a nota' });
    }

    // Monta o objeto, aceita campos opcionais
    const entrega = {
      nota,
      cliente_nome: cliente,
      cliente_cnpj: cnpj || null,
      data_emissao: dataEmissao || null,
      valor_total: total || 0,
      remetente_nome: remetente || null,
      vendedor: '',
      motorista: null,
      observacao: '',
      status: 'PENDENTE',
      xml_path: xml_path || null,
      pdf_path: pdf_path || null
    };

    // Faz o UPSERT na mão: insere se não existe, atualiza se já existe
    db.query(
      'INSERT INTO entregas SET ? ON DUPLICATE KEY UPDATE ?',
      [entrega, entrega],
      (err, result) => {
        if (err) {
          console.error('[UPLOAD-NOTA] Erro SQL:', err.message);
          return res.status(500).json({ error: 'Erro ao salvar no banco', detalhe: err.message });
        }

        if (result.affectedRows === 1 && result.insertId > 0) {
          console.log(`✅ Nota ${nota} salva no banco com ID ${result.insertId}`);
        } else {
          console.log(`♻️ Nota ${nota} já existia, dados atualizados`);
        }
        return res.json({ success: true, nota });
      }
    );
  } catch (e) {
    console.error('[UPLOAD-NOTA] Erro inesperado:', e);
    res.status(500).json({ error: 'Erro inesperado', detalhe: String(e) });
  }
});



// Upload de canhoto
app.post('/canhoto/:id', autenticar, upload.single('file'), (req, res) => {
  const entregaId = req.params.id;

  console.log(`📦 Recebendo canhoto para entrega ${entregaId}`);
  console.log('🗂 Arquivo recebido:', req.file);

  if (!req.file) {
    console.log('❌ Nenhum arquivo recebido');
    return res.status(400).json({ error: 'Arquivo não recebido' });
  }

  const caminho = `uploads/${req.file.filename}`.replace(/\\/g, '/');


  db.query('UPDATE entregas SET canhoto_path = ?, data_entrega = NOW(), status = "ENTREGUE" WHERE id = ?', [caminho, entregaId], (err) => {
    if (err) {
      console.error('❌ Erro ao salvar canhoto no banco:', err);
      return res.status(500).json({ error: 'Erro ao salvar canhoto' });
    }

    console.log('✅ Canhoto salvo com sucesso em:', caminho);
    res.json({ success: true, path: caminho });
  });
});


// ✅ Rota: /minhas-entregas - Versão Corrigida
app.get('/minhas-entregas', autenticar, (req, res) => {
  const motoristaId = req.usuario.id;
  
  console.log(`🔍 Buscando entregas para motorista ID: ${motoristaId}`);
  
  // Consulta corrigida: busca TODAS as entregas do motorista, não apenas pendentes
  const sql = `
    SELECT * 
    FROM entregas 
    WHERE motorista = ?
    ORDER BY data_emissao DESC
  `;
  
  db.query(sql, [motoristaId], (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar entregas:', err);
      return res.status(500).json({ error: 'Erro ao buscar entregas' });
    }
    
    console.log(`✅ Encontradas ${results.length} entregas para o motorista ${motoristaId}`);
    
    // Filtra apenas pendentes para exibição (opcional)
    const entregasPendentes = results.filter(e => e.status === 'PENDENTE');
    console.log(`📦 ${entregasPendentes.length} entregas pendentes`);
    
    res.json(results);
  });
});
// ✅ Rota: /atribuir-motorista - Versão Corrigida
app.put('/atribuir-motorista', autenticar, (req, res) => {
  const { entregaId, motoristaId } = req.body;
  
  if (!entregaId || !motoristaId) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  console.log(`🔧 Atribuindo entrega ${entregaId} ao motorista ${motoristaId}`);

  // Verifica se a entrega existe
  db.query('SELECT * FROM entregas WHERE id = ?', [entregaId], (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar entrega:', err);
      return res.status(500).json({ error: 'Erro ao buscar entrega' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Entrega não encontrada' });
    }

    const entrega = results[0];
    
    // Verifica se já está entregue
    if (entrega.status === 'ENTREGUE') {
      return res.status(400).json({ 
        error: 'Entrega já concluída, não pode ser reatribuída'
      });
    }

    // PERMITE REATRIBUIR MESMO SE JÁ TIVER MOTORISTA
    db.query(
      'UPDATE entregas SET motorista = ?, status = "PENDENTE" WHERE id = ?',
      [motoristaId, entregaId],
      (updateErr) => {
        if (updateErr) {
          console.error('❌ Erro ao atualizar entrega:', updateErr);
          return res.status(500).json({ error: 'Erro ao atualizar entrega' });
        }
        
        console.log(`✅ Entrega ${entregaId} atribuída com sucesso ao motorista ${motoristaId}`);
        res.json({ success: true });
      }
    );
  });
});

// Listagem de usuários
app.get('/usuarios', autenticar, (req, res) => {
  db.query('SELECT id, nome, tipo FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar usuários' });
    res.json(results);
  });
});

app.get('/entregas', autenticar, (req, res) => {
  const { status, motorista, dataInicio, dataFim, semMotorista, busca } = req.query;
  let sql = `
    SELECT e.*, u.nome AS nome_motorista
    FROM entregas e
    LEFT JOIN usuarios u ON e.motorista = u.id
    WHERE 1 = 1
  `;
  const params = [];
  if (status) { sql += " AND e.status = ?"; params.push(status); }
  if (motorista) { sql += " AND e.motorista = ?"; params.push(motorista); }
  if (semMotorista === 'true') { sql += " AND e.motorista IS NULL"; }
  if (dataInicio && dataFim) { sql += " AND DATE(e.data_emissao) BETWEEN ? AND ?"; params.push(dataInicio, dataFim); }

  if (busca && busca.length >= 1) {
    if (/^\d+$/.test(busca)) {
      const buscaInt = String(Number(busca));
      if (buscaInt.length === 11 || buscaInt.length === 14) {
        sql += " AND e.cliente_cnpj = ?";
        params.push(buscaInt);
      } else {
        sql += " AND CAST(e.nota AS UNSIGNED) = ?";
        params.push(Number(busca));
      }
    } else {
      sql += " AND LOWER(e.cliente_nome) LIKE ?";
      params.push(`%${busca.toLowerCase()}%`);
    }
  }

  sql += " ORDER BY e.data_emissao DESC, e.id DESC";
  db.query(sql, params, (err, resultados) => {
    if (err) {
      console.error('❌ Erro ao buscar entregas:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar entregas' });
    }
    res.json(resultados);
  });
});




// Exportar para Excel
app.get('/exportar/excel', autenticar, (req, res) => {
  const { inicio, fim, motorista } = req.query;
  const filtros = ['DATE(data_lancamento) BETWEEN ? AND ?'];
  const valores = [inicio, fim];

  if (motorista) {
    filtros.push('motorista = ?');
    valores.push(motorista);
  }

  const sql = `
    SELECT e.*, u.nome AS motorista_nome
    FROM entregas e
    LEFT JOIN usuarios u ON e.motorista = u.id
    WHERE ${filtros.join(' AND ')}
    ORDER BY data_lancamento DESC
  `;

  db.query(sql, valores, async (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro ao gerar Excel' });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Entregas');

    sheet.columns = [
      { header: 'Nota', key: 'nota' },
      { header: 'Cliente', key: 'cliente_nome' },
      { header: 'CNPJ', key: 'cliente_cnpj' },
      { header: 'Valor', key: 'valor_total' },
      { header: 'Data Lanca', key: 'data_lancamento' },
      { header: 'Status', key: 'status' },
      { header: 'Motorista', key: 'motorista_nome' },
    ];

    results.forEach(row => sheet.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  });
});
// ✅ Rota: /relatorio-vendedor?data=YYYY-MM-DD
// Retorna um resumo por motorista: total de notas, valor total, e quantas voltaram

app.get('/relatorio-vendedor', autenticar, (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ error: 'Data obrigatória' });

  const sqlResumo = `
    SELECT 
      u.id AS motorista_id,
      u.nome AS motorista_nome,
      COUNT(e.id) AS total_notas,
      SUM(e.valor_total) AS valor_total,
      SUM(CASE WHEN e.status = 'PENDENTE' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN e.status = 'ENTREGUE' THEN 1 ELSE 0 END) AS entregues
    FROM entregas e
    LEFT JOIN usuarios u ON e.motorista = u.id
    WHERE DATE(e.data_lancamento) = ?
    GROUP BY e.motorista
  `;

  const sqlDetalhes = `
    SELECT e.*, u.nome AS motorista_nome
    FROM entregas e
    LEFT JOIN usuarios u ON e.motorista = u.id
    WHERE DATE(e.data_lancamento) = ?
    ORDER BY e.motorista, e.data_lancamento DESC
  `;

  db.query(sqlResumo, [data], (err, resumo) => {
    if (err) return res.status(500).json({ error: 'Erro no resumo' });

    db.query(sqlDetalhes, [data], (err2, detalhes) => {
      if (err2) return res.status(500).json({ error: 'Erro nos detalhes' });

      res.json({ resumo, detalhes });
    });
  });
});



// Servir imagens de canhoto




// Atualize a rota de uploads para usar caminho absoluto
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, req.params.filename); // Corrigido aqui
  
  if (fs.existsSync(filePath)) {
    const tipoMime = mime.contentType(path.extname(filePath));
    if (tipoMime) res.setHeader('Content-Type', tipoMime);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});


// Excluir canhoto (somente admin)
app.delete('/canhoto/:nota', autenticar, (req, res) => {
  if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({ error: 'Apenas o administrador pode excluir canhotos' });
  }

  const nota = req.params.nota;

  db.query('SELECT canhoto_path FROM entregas WHERE nota = ?', [nota], (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ error: 'Entrega não encontrada' });
    }

    const filePath = results[0].canhoto_path;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.query('UPDATE entregas SET canhoto_path = NULL, status = "PENDENTE", data_entrega = NULL WHERE nota = ?', [nota], (err2) => {
      if (err2) return res.status(500).json({ error: 'Erro ao atualizar entrega' });
      res.json({ success: true, mensagem: 'Canhoto excluído com sucesso' });
    });
  });
});

app.put('/entregas/concluir/:id', autenticar, (req, res) => {
  const id = req.params.id;
  db.query(
    'UPDATE entregas SET status = "ENTREGUE", data_entrega = CURDATE() WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar entrega' });
      res.json({ success: true });
    }
  );
});



app.listen(3000, '0.0.0.0', () => console.log('🚀 API rodando na porta 3000'));
