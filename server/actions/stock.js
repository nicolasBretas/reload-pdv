const { db } = require('../db');
const { generateId } = require('../ids');
const { getProductById, adjustStock } = require('./products');

function toEntry(row) {
  return {
    id: row.id,
    supplierId: row.supplierId || '',
    supplierNome: row.supplierNome || '',
    numeroNota: row.numeroNota || '',
    dataHora: row.dataHora,
    operadorNome: row.operadorNome || '',
    valorTotal: Number(row.valorTotal),
    observacao: row.observacao || ''
  };
}

function registrarEntradaEstoque({ supplierId, supplierNome, numeroNota, observacao, operadorNome, itens }) {
  if (!Array.isArray(itens) || !itens.length) {
    throw new Error('Adicione ao menos um produto na entrada de estoque.');
  }

  const linhas = itens.map(item => {
    const product = getProductById(item.produtoId);

    if (!product) {
      throw new Error('Produto não encontrado na entrada de estoque.');
    }

    const quantidade = Number(item.quantidade || 0);
    const custoUnitario = Number(item.custoUnitario || 0);

    if (quantidade <= 0) {
      throw new Error(`Informe uma quantidade válida para ${product.nome}.`);
    }

    return { product, quantidade, custoUnitario };
  });

  const valorTotal = linhas.reduce((sum, linha) => sum + linha.quantidade * linha.custoUnitario, 0);
  const id = generateId('ENT');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO stock_entries (id, supplierId, supplierNome, numeroNota, dataHora, operadorNome, valorTotal, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, supplierId || '', supplierNome || '', numeroNota || '', now, operadorNome || '', valorTotal, observacao || '');

  for (const linha of linhas) {
    db.prepare(
      `INSERT INTO stock_entry_items (id, entryId, produtoId, produtoNome, quantidade, custoUnitario)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(generateId('ENTI'), id, linha.product.id, linha.product.nome, linha.quantidade, linha.custoUnitario);

    adjustStock(linha.product.id, linha.quantidade);

    db.prepare('UPDATE products SET custo = ?, atualizadoEm = ? WHERE id = ?').run(
      linha.custoUnitario,
      now,
      linha.product.id
    );
  }

  return toEntry(db.prepare('SELECT * FROM stock_entries WHERE id = ?').get(id));
}

function listarEntradasEstoque() {
  const entries = db.prepare('SELECT * FROM stock_entries ORDER BY dataHora DESC').all();

  return entries.map(entry => {
    const itens = db
      .prepare('SELECT * FROM stock_entry_items WHERE entryId = ?')
      .all(entry.id)
      .map(item => ({
        produtoId: item.produtoId,
        produtoNome: item.produtoNome,
        quantidade: Number(item.quantidade),
        custoUnitario: Number(item.custoUnitario)
      }));

    return { ...toEntry(entry), itens };
  });
}

module.exports = { registrarEntradaEstoque, listarEntradasEstoque };
