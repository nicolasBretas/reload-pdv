const { db } = require('../db');
const { generateId } = require('../ids');
const { getProductById, adjustStock } = require('./products');
const { requireAdminPin } = require('./operators');

function buildOrder(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

  if (!order) {
    return null;
  }

  const itens = db
    .prepare('SELECT * FROM order_items WHERE pedidoId = ? ORDER BY rowid')
    .all(orderId)
    .map(item => ({
      id: item.id,
      produtoId: item.produtoId,
      produto: item.produto,
      variante: item.variante || '',
      quantidade: Number(item.quantidade),
      valorUnitario: Number(item.valorUnitario),
      desconto: Number(item.desconto || 0),
      total: Number(item.total)
    }));

  return {
    id: order.id,
    clienteId: order.clienteId || '',
    clienteNome: order.clienteNome,
    operadorId: order.operadorId || '',
    operadorNome: order.operadorNome || '',
    status: order.status,
    subtotal: Number(order.subtotal),
    desconto: Number(order.desconto),
    total: Number(order.total),
    formaPagamento: order.formaPagamento || '',
    dataHoraAbertura: order.dataHoraAbertura,
    dataHoraFechamento: order.dataHoraFechamento,
    itens,
    quantidadeItens: itens.reduce((sum, item) => sum + item.quantidade, 0)
  };
}

function recalculateSubtotal(orderId) {
  const total = db
    .prepare('SELECT COALESCE(SUM(total), 0) AS total FROM order_items WHERE pedidoId = ?')
    .get(orderId).total;

  db.prepare('UPDATE orders SET subtotal = ?, total = ? WHERE id = ?').run(
    total,
    total,
    orderId
  );
}

function criarPedido({ clienteId, clienteNome, operadorId, operadorNome }) {
  let resolvedClienteNome = clienteNome || 'Consumidor Final';

  if (clienteId) {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clienteId);

    if (!client) {
      throw new Error('Cliente não encontrado.');
    }

    resolvedClienteNome = client.nome;

    // Uma comanda aberta por cliente: se já existe, devolve a mesma.
    const existing = db
      .prepare("SELECT id FROM orders WHERE clienteId = ? AND status = 'aberto' ORDER BY dataHoraAbertura DESC LIMIT 1")
      .get(clienteId);

    if (existing) {
      return { ...buildOrder(existing.id), existente: true };
    }
  }

  const id = generateId('PED');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO orders (id, clienteId, clienteNome, operadorId, operadorNome, status, subtotal, desconto, total, dataHoraAbertura)
     VALUES (?, ?, ?, ?, ?, 'aberto', 0, 0, 0, ?)`
  ).run(id, clienteId || '', resolvedClienteNome, operadorId || '', operadorNome || '', now);

  return buildOrder(id);
}

function listarPedidosAbertos() {
  const rows = db
    .prepare("SELECT * FROM orders WHERE status = 'aberto' ORDER BY dataHoraAbertura DESC")
    .all();

  return rows.map(row => buildOrder(row.id));
}

function obterPedido({ id }) {
  const order = buildOrder(id);

  if (!order) {
    throw new Error('Pedido não encontrado.');
  }

  return order;
}

function requireOpenOrder(pedidoId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(pedidoId);

  if (!order) {
    throw new Error('Pedido não encontrado.');
  }

  if (order.status !== 'aberto') {
    throw new Error('Este pedido não está mais aberto.');
  }

  return order;
}

function adicionarItemPedido({ pedidoId, produtoId, quantidade }) {
  requireOpenOrder(pedidoId);

  const product = getProductById(produtoId);

  if (!product) {
    throw new Error('Produto não encontrado.');
  }

  const qty = Number(quantidade || 1);

  if (product.quantidade < qty) {
    throw new Error('Estoque insuficiente para este produto.');
  }

  const existingItem = db
    .prepare('SELECT * FROM order_items WHERE pedidoId = ? AND produtoId = ?')
    .get(pedidoId, produtoId);

  if (existingItem) {
    const newQty = Number(existingItem.quantidade) + qty;
    const desconto = Number(existingItem.desconto || 0);
    const newTotal = Math.max(0, Number(existingItem.valorUnitario) * newQty - desconto);

    db.prepare('UPDATE order_items SET quantidade = ?, total = ? WHERE id = ?').run(
      newQty,
      newTotal,
      existingItem.id
    );
  } else {
    db.prepare(
      `INSERT INTO order_items (id, pedidoId, produtoId, produto, variante, quantidade, valorUnitario, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      generateId('ITEM'),
      pedidoId,
      produtoId,
      product.nome,
      product.variante,
      qty,
      product.venda,
      product.venda * qty
    );
  }

  recalculateSubtotal(pedidoId);

  return buildOrder(pedidoId);
}

function aplicarDescontoItem({ itemId, desconto }) {
  const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(itemId);

  if (!item) {
    throw new Error('Item não encontrado no pedido.');
  }

  requireOpenOrder(item.pedidoId);

  const valorCheio = Number(item.valorUnitario) * Number(item.quantidade);
  const descontoClamp = Math.min(Math.max(0, Number(desconto || 0)), valorCheio);
  const novoTotal = valorCheio - descontoClamp;

  db.prepare('UPDATE order_items SET desconto = ?, total = ? WHERE id = ?').run(
    descontoClamp,
    novoTotal,
    itemId
  );

  recalculateSubtotal(item.pedidoId);

  return buildOrder(item.pedidoId);
}

function removerItemPedido({ itemId }) {
  const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(itemId);

  if (!item) {
    throw new Error('Item não encontrado no pedido.');
  }

  db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId);
  recalculateSubtotal(item.pedidoId);

  return buildOrder(item.pedidoId);
}

function cancelarPedido({ pedidoId, adminPin, observacao }) {
  requireAdminPin(adminPin);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(pedidoId);

  if (!order) {
    throw new Error('Pedido não encontrado.');
  }

  db.prepare(
    "UPDATE orders SET status = 'cancelado', dataHoraFechamento = ?, observacaoFechamento = ? WHERE id = ?"
  ).run(new Date().toISOString(), observacao || '', pedidoId);

  return { id: pedidoId };
}

function fecharComandaVazia({ pedidoId, operadorNome }) {
  requireOpenOrder(pedidoId);

  const { quantidade } = db
    .prepare('SELECT COUNT(*) AS quantidade FROM order_items WHERE pedidoId = ?')
    .get(pedidoId);

  if (quantidade > 0) {
    throw new Error('A comanda tem itens. Finalize a venda ou cancele com PIN de administrador.');
  }

  db.prepare(
    "UPDATE orders SET status = 'cancelado', dataHoraFechamento = ?, observacaoFechamento = ? WHERE id = ?"
  ).run(new Date().toISOString(), `Comanda vazia fechada${operadorNome ? ` por ${operadorNome}` : ''}.`, pedidoId);

  return { id: pedidoId };
}

function finalizarPedido({ pedidoId, formaPagamento, desconto, valorRecebido, requestId, operadorNome }) {
  if (requestId) {
    const existingSale = db.prepare('SELECT * FROM sales WHERE requestId = ?').get(requestId);

    if (existingSale) {
      return {
        duplicado: true,
        venda: {
          id: existingSale.id,
          pedidoId: existingSale.pedidoId,
          total: Number(existingSale.total),
          troco: Number(existingSale.troco || 0)
        }
      };
    }
  }

  const order = requireOpenOrder(pedidoId);
  const items = db.prepare('SELECT * FROM order_items WHERE pedidoId = ?').all(pedidoId);

  if (!items.length) {
    throw new Error('Adicione pelo menos um produto antes de finalizar.');
  }

  const descontoValue = Math.max(0, Number(desconto || 0));
  const subtotal = Number(order.subtotal);
  const total = Math.max(0, subtotal - descontoValue);

  let recebido = null;
  let troco = 0;

  if (formaPagamento === 'dinheiro' && valorRecebido !== undefined && valorRecebido !== null && valorRecebido !== '') {
    recebido = Number(valorRecebido);

    if (!Number.isFinite(recebido) || recebido < 0) {
      throw new Error('Valor recebido inválido.');
    }

    if (recebido + 0.005 < total) {
      throw new Error('Valor recebido é menor que o total da venda.');
    }

    troco = Math.round((recebido - total) * 100) / 100;
  }

  let custoTotal = 0;

  for (const item of items) {
    const product = getProductById(item.produtoId);
    const custoUnitario = product ? product.custo : 0;

    custoTotal += custoUnitario * Number(item.quantidade);
    adjustStock(item.produtoId, -Number(item.quantidade));
  }

  const lucroBruto = total - custoTotal;
  const now = new Date().toISOString();
  const saleId = generateId('VENDA');

  db.prepare(
    `INSERT INTO sales (id, pedidoId, clienteNome, operadorNome, formaPagamento, total, custoTotal, lucroBruto, dataHora, requestId, valorRecebido, troco)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    saleId,
    pedidoId,
    order.clienteNome,
    operadorNome || order.operadorNome || '',
    formaPagamento,
    total,
    custoTotal,
    lucroBruto,
    now,
    requestId || null,
    recebido,
    troco
  );

  db.prepare(
    "UPDATE orders SET status = 'finalizado', desconto = ?, total = ?, formaPagamento = ?, dataHoraFechamento = ? WHERE id = ?"
  ).run(descontoValue, total, formaPagamento, now, pedidoId);

  return {
    duplicado: false,
    venda: { id: saleId, pedidoId, total, custoTotal, lucroBruto, dataHora: now, valorRecebido: recebido, troco }
  };
}

module.exports = {
  criarPedido,
  listarPedidosAbertos,
  obterPedido,
  adicionarItemPedido,
  aplicarDescontoItem,
  removerItemPedido,
  cancelarPedido,
  fecharComandaVazia,
  finalizarPedido
};
