const { db } = require('../db');
const { generateId } = require('../ids');

function toClient(row) {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone || '',
    email: row.email || '',
    observacao: row.observacao || '',
    criadoEm: row.criadoEm
  };
}

function listarClientes() {
  const rows = db
    .prepare('SELECT * FROM clients WHERE arquivado = 0 ORDER BY nome')
    .all();

  return rows.map(toClient);
}

function adicionarCliente(payload) {
  if (!payload.nome) {
    throw new Error('Nome do cliente é obrigatório.');
  }

  const id = generateId('CLI');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO clients (id, nome, telefone, email, observacao, arquivado, criadoEm)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(id, payload.nome, payload.telefone || '', payload.email || '', payload.observacao || '', now);

  return toClient(db.prepare('SELECT * FROM clients WHERE id = ?').get(id));
}

function editarCliente(payload) {
  if (!payload.id) {
    throw new Error('Cliente não encontrado.');
  }

  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(payload.id);

  if (!existing) {
    throw new Error('Cliente não encontrado.');
  }

  db.prepare(
    'UPDATE clients SET nome = ?, telefone = ?, email = ?, observacao = ? WHERE id = ?'
  ).run(payload.nome, payload.telefone || '', payload.email || '', payload.observacao || '', payload.id);

  return toClient(db.prepare('SELECT * FROM clients WHERE id = ?').get(payload.id));
}

function arquivarCliente({ id }) {
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

  if (!existing) {
    throw new Error('Cliente não encontrado.');
  }

  db.prepare('UPDATE clients SET arquivado = 1 WHERE id = ?').run(id);

  return { id };
}

function getClientById(id) {
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  return row ? toClient(row) : null;
}

module.exports = { listarClientes, adicionarCliente, editarCliente, arquivarCliente, getClientById };
