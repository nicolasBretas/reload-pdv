const { db } = require('../db');
const { generateId } = require('../ids');
const { adjustStock, getProductById } = require('./products');
const { requireAdminPin } = require('./operators');

function toReturn(row) {
  return {
    id: row.id,
    saleId: row.saleId,
    pedidoId: row.pedidoId,
    produtoId: row.produtoId,
    produtoNome: row.produtoNome,
    quantidade: Number(row.quantidade),
    valorUnitario: Number(row.valorUnitario),
    custoUnitario: Number(row.custoUnitario || 0),
    valorDevolvido: Number(row.valorDevolvido),
    tipo: row.tipo,
    motivo: row.motivo || '',
    operadorNome: row.operadorNome || '',
    dataHora: row.dataHora
  };
}

function buscarVendaParaDevolucao({ pedidoId }) {
  const venda = db.prepare('SELECT * FROM sales WHERE pedidoId = ?').get(pedidoId);

  if (!venda) {
    throw new Error('Venda não encontrada para este pedido.');
  }

  const itensOriginais = db.prepare('SELECT * FROM order_items WHERE pedidoId = ?').all(pedidoId);
  const devolucoesAnteriores = db
    .prepare("SELECT produtoId, SUM(quantidade) AS total FROM returns WHERE pedidoId = ? GROUP BY produtoId")
    .all(pedidoId);

  const devolvidoPorProduto = devolucoesAnteriores.reduce((acc, row) => {
    acc[row.produtoId] = Number(row.total);
    return acc;
  }, {});

  const itens = itensOriginais.map(item => ({
    itemId: item.id,
    produtoId: item.produtoId,
    produtoNome: item.produto,
    quantidade: Number(item.quantidade),
    valorUnitario: Number(item.valorUnitario),
    quantidadeJaDevolvida: devolvidoPorProduto[item.produtoId] || 0
  }));

  return {
    venda: {
      id: venda.id,
      pedidoId: venda.pedidoId,
      clienteNome: venda.clienteNome,
      total: Number(venda.total),
      dataHora: venda.dataHora
    },
    itens
  };
}

function registrarDevolucao({ pedidoId, itemId, quantidade, tipo, motivo, operadorNome, adminPin }) {
  requireAdminPin(adminPin);

  if (!['devolucao', 'troca'].includes(tipo)) {
    throw new Error('Tipo de devolução inválido.');
  }

  const venda = db.prepare('SELECT * FROM sales WHERE pedidoId = ?').get(pedidoId);

  if (!venda) {
    throw new Error('Venda não encontrada para este pedido.');
  }

  const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND pedidoId = ?').get(itemId, pedidoId);

  if (!item) {
    throw new Error('Item não encontrado nesta venda.');
  }

  const jaDevolvido = db
    .prepare("SELECT COALESCE(SUM(quantidade), 0) AS total FROM returns WHERE pedidoId = ? AND produtoId = ?")
    .get(pedidoId, item.produtoId).total;

  const quantidadeDevolver = Number(quantidade || 0);
  const restante = Number(item.quantidade) - Number(jaDevolvido);

  if (quantidadeDevolver <= 0) {
    throw new Error('Informe uma quantidade maior que zero.');
  }

  if (quantidadeDevolver > restante) {
    throw new Error(`Só é possível devolver até ${restante} unidade(s) deste item.`);
  }

  const valorUnitario = Number(item.valorUnitario);
  const precoEfetivoUnitario = Number(item.total) / Number(item.quantidade);
  const valorDevolvido = tipo === 'devolucao' ? precoEfetivoUnitario * quantidadeDevolver : 0;
  const product = getProductById(item.produtoId);
  const custoUnitario = product ? product.custo : 0;

  const id = generateId('DEV');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO returns (id, saleId, pedidoId, produtoId, produtoNome, quantidade, valorUnitario, custoUnitario, valorDevolvido, tipo, motivo, operadorNome, dataHora)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    venda.id,
    pedidoId,
    item.produtoId,
    item.produto,
    quantidadeDevolver,
    valorUnitario,
    custoUnitario,
    valorDevolvido,
    tipo,
    motivo || '',
    operadorNome || '',
    now
  );

  adjustStock(item.produtoId, quantidadeDevolver);

  return toReturn(db.prepare('SELECT * FROM returns WHERE id = ?').get(id));
}

function listarDevolucoes({ data }) {
  let query = 'SELECT * FROM returns';
  const values = [];

  if (data) {
    query += ' WHERE substr(dataHora, 1, 10) = ?';
    values.push(data);
  }

  query += ' ORDER BY dataHora DESC';

  return db.prepare(query).all(...values).map(toReturn);
}

module.exports = { buscarVendaParaDevolucao, registrarDevolucao, listarDevolucoes };
