const { db } = require('../db');
const { generateId } = require('../ids');

function toSupplier(row) {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone || '',
    email: row.email || '',
    cnpj: row.cnpj || '',
    observacao: row.observacao || '',
    criadoEm: row.criadoEm
  };
}

function listarFornecedores() {
  const rows = db
    .prepare('SELECT * FROM suppliers WHERE arquivado = 0 ORDER BY nome')
    .all();

  return rows.map(toSupplier);
}

function adicionarFornecedor(payload) {
  if (!payload.nome) {
    throw new Error('Nome do fornecedor é obrigatório.');
  }

  const id = generateId('FORN');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO suppliers (id, nome, telefone, email, cnpj, observacao, arquivado, criadoEm)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(id, payload.nome, payload.telefone || '', payload.email || '', payload.cnpj || '', payload.observacao || '', now);

  return toSupplier(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id));
}

function editarFornecedor(payload) {
  if (!payload.id) {
    throw new Error('Fornecedor não encontrado.');
  }

  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(payload.id);

  if (!existing) {
    throw new Error('Fornecedor não encontrado.');
  }

  db.prepare(
    'UPDATE suppliers SET nome = ?, telefone = ?, email = ?, cnpj = ?, observacao = ? WHERE id = ?'
  ).run(payload.nome, payload.telefone || '', payload.email || '', payload.cnpj || '', payload.observacao || '', payload.id);

  return toSupplier(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(payload.id));
}

function arquivarFornecedor({ id }) {
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);

  if (!existing) {
    throw new Error('Fornecedor não encontrado.');
  }

  db.prepare('UPDATE suppliers SET arquivado = 1 WHERE id = ?').run(id);

  return { id };
}

module.exports = { listarFornecedores, adicionarFornecedor, editarFornecedor, arquivarFornecedor };
