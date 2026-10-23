const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { generateId } = require('./ids');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'reload.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'pdfs'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'backups'), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS operators (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    pin TEXT NOT NULL,
    perfil TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    categoria TEXT NOT NULL,
    nome TEXT NOT NULL,
    variante TEXT,
    codigo TEXT,
    quantidade INTEGER NOT NULL DEFAULT 0,
    minimo INTEGER NOT NULL DEFAULT 0,
    custo REAL NOT NULL DEFAULT 0,
    venda REAL NOT NULL DEFAULT 0,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criadoEm TEXT NOT NULL,
    atualizadoEm TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    observacao TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criadoEm TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    clienteId TEXT,
    clienteNome TEXT NOT NULL,
    operadorId TEXT,
    operadorNome TEXT,
    status TEXT NOT NULL DEFAULT 'aberto',
    subtotal REAL NOT NULL DEFAULT 0,
    desconto REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    formaPagamento TEXT,
    dataHoraAbertura TEXT NOT NULL,
    dataHoraFechamento TEXT,
    requestId TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    pedidoId TEXT NOT NULL,
    produtoId TEXT NOT NULL,
    produto TEXT NOT NULL,
    variante TEXT,
    quantidade REAL NOT NULL,
    valorUnitario REAL NOT NULL,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cash_days (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'fechado',
    saldoInicial REAL NOT NULL DEFAULT 0,
    saldoInformado REAL,
    sangrias REAL NOT NULL DEFAULT 0,
    despesas REAL NOT NULL DEFAULT 0,
    diferenca REAL,
    operadorAbertura TEXT,
    operadorFechamento TEXT,
    dataHoraAbertura TEXT,
    dataHoraFechamento TEXT,
    observacaoAbertura TEXT,
    observacaoFechamento TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    pedidoId TEXT NOT NULL,
    clienteNome TEXT,
    operadorNome TEXT,
    formaPagamento TEXT,
    total REAL NOT NULL,
    custoTotal REAL NOT NULL,
    lucroBruto REAL NOT NULL,
    dataHora TEXT NOT NULL,
    requestId TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    nivel TEXT,
    origem TEXT,
    acao TEXT,
    mensagem TEXT,
    detalhes TEXT,
    usuario TEXT,
    dataHora TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pdf_reports (
    id TEXT PRIMARY KEY,
    arquivoNome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    periodo TEXT NOT NULL,
    dataHora TEXT NOT NULL,
    geradoPor TEXT,
    status TEXT NOT NULL,
    caminho TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    arquivoNome TEXT NOT NULL,
    dataHora TEXT NOT NULL,
    criadoPor TEXT,
    status TEXT NOT NULL,
    mensagem TEXT,
    caminho TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    tipo TEXT NOT NULL,
    valor REAL NOT NULL,
    motivo TEXT,
    operadorNome TEXT,
    dataHora TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    saleId TEXT NOT NULL,
    pedidoId TEXT NOT NULL,
    produtoId TEXT NOT NULL,
    produtoNome TEXT NOT NULL,
    quantidade REAL NOT NULL,
    valorUnitario REAL NOT NULL,
    custoUnitario REAL NOT NULL DEFAULT 0,
    valorDevolvido REAL NOT NULL,
    tipo TEXT NOT NULL,
    motivo TEXT,
    operadorNome TEXT,
    dataHora TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    cnpj TEXT,
    observacao TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criadoEm TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_entries (
    id TEXT PRIMARY KEY,
    supplierId TEXT,
    supplierNome TEXT,
    numeroNota TEXT,
    dataHora TEXT NOT NULL,
    operadorNome TEXT,
    valorTotal REAL NOT NULL DEFAULT 0,
    observacao TEXT
  );

  CREATE TABLE IF NOT EXISTS stock_entry_items (
    id TEXT PRIMARY KEY,
    entryId TEXT NOT NULL,
    produtoId TEXT NOT NULL,
    produtoNome TEXT NOT NULL,
    quantidade REAL NOT NULL,
    custoUnitario REAL NOT NULL
  );
`);

function addColumnIfMissing(sql) {
  try {
    db.exec(sql);
  } catch (error) {
    if (!/duplicate column/i.test(error.message)) {
      throw error;
    }
  }
}

function migrate() {
  addColumnIfMissing('ALTER TABLE order_items ADD COLUMN desconto REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('ALTER TABLE returns ADD COLUMN custoUnitario REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('ALTER TABLE sales ADD COLUMN valorRecebido REAL');
  addColumnIfMissing('ALTER TABLE sales ADD COLUMN troco REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('ALTER TABLE orders ADD COLUMN observacaoFechamento TEXT');
}

migrate();

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS total FROM operators').get().total;

  if (count > 0) {
    return;
  }

  const insertOperator = db.prepare(
    'INSERT INTO operators (id, nome, pin, perfil, ativo) VALUES (?, ?, ?, ?, 1)'
  );

  insertOperator.run(generateId('OP'), 'Administrador', '1234', 'admin');
  insertOperator.run(generateId('OP'), 'Operador', '0000', 'operador');
}

seed();

module.exports = { db, DATA_DIR, DB_PATH };
