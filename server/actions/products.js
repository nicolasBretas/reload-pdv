const { db } = require('../db');
const { generateId } = require('../ids');

function toProduct(row) {
  return {
    id: row.id,
    categoria: row.categoria,
    nome: row.nome,
    variante: row.variante || '',
    codigo: row.codigo || '',
    quantidade: Number(row.quantidade),
    minimo: Number(row.minimo),
    custo: Number(row.custo),
    venda: Number(row.venda),
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm
  };
}

function listarProdutos() {
  const rows = db
    .prepare('SELECT * FROM products WHERE arquivado = 0 ORDER BY categoria, nome')
    .all();

  return rows.map(toProduct);
}

function adicionarProduto(payload) {
  if (!payload.nome || !payload.categoria) {
    throw new Error('Nome e categoria são obrigatórios.');
  }

  const id = generateId('PROD');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO products (id, categoria, nome, variante, codigo, quantidade, minimo, custo, venda, arquivado, criadoEm, atualizadoEm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    id,
    payload.categoria,
    payload.nome,
    payload.variante || '',
    payload.codigo || '',
    Number(payload.quantidade || 0),
    Number(payload.minimo || 0),
    Number(payload.custo || 0),
    Number(payload.venda || 0),
    now,
    now
  );

  return toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
}

function editarProduto(payload) {
  if (!payload.id) {
    throw new Error('Produto não encontrado.');
  }

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(payload.id);

  if (!existing) {
    throw new Error('Produto não encontrado.');
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE products SET categoria = ?, nome = ?, variante = ?, codigo = ?, quantidade = ?, minimo = ?, custo = ?, venda = ?, atualizadoEm = ?
     WHERE id = ?`
  ).run(
    payload.categoria,
    payload.nome,
    payload.variante || '',
    payload.codigo || '',
    Number(payload.quantidade || 0),
    Number(payload.minimo || 0),
    Number(payload.custo || 0),
    Number(payload.venda || 0),
    now,
    payload.id
  );

  return toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(payload.id));
}

function arquivarProduto({ id }) {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

  if (!existing) {
    throw new Error('Produto não encontrado.');
  }

  db.prepare('UPDATE products SET arquivado = 1, atualizadoEm = ? WHERE id = ?').run(
    new Date().toISOString(),
    id
  );

  return { id };
}

function getProductById(id) {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return row ? toProduct(row) : null;
}

function adjustStock(id, delta) {
  db.prepare(
    'UPDATE products SET quantidade = quantidade + ?, atualizadoEm = ? WHERE id = ?'
  ).run(delta, new Date().toISOString(), id);
}

module.exports = {
  listarProdutos,
  adicionarProduto,
  editarProduto,
  arquivarProduto,
  getProductById,
  adjustStock,
  toProduct
};
