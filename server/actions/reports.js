const { db } = require('../db');

const DAS_PERCENT = 0.04;

function toVenda(row) {
  return {
    dataHora: row.dataHora,
    pedidoId: row.pedidoId,
    clienteNome: row.clienteNome,
    operadorNome: row.operadorNome,
    formaPagamento: row.formaPagamento,
    total: Number(row.total),
    custoTotal: Number(row.custoTotal),
    lucroBruto: Number(row.lucroBruto)
  };
}

function devolucoesNoPrefixo(campo, prefixo) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(valorDevolvido), 0) AS valorDevolvido, COALESCE(SUM(custoUnitario * quantidade), 0) AS custoDevolvido
       FROM returns WHERE tipo = 'devolucao' AND substr(${campo}, 1, ?) = ?`
    )
    .get(prefixo.length, prefixo);

  return {
    valorDevolvido: Number(row.valorDevolvido),
    custoDevolvido: Number(row.custoDevolvido)
  };
}

function buildReport(rows, devolucoes = { valorDevolvido: 0, custoDevolvido: 0 }) {
  const vendas = rows.map(toVenda);

  const totalVendido = vendas.reduce((sum, venda) => sum + venda.total, 0) - devolucoes.valorDevolvido;
  const custoTotal = vendas.reduce((sum, venda) => sum + venda.custoTotal, 0) - devolucoes.custoDevolvido;
  const lucroBruto = vendas.reduce((sum, venda) => sum + venda.lucroBruto, 0) - devolucoes.valorDevolvido + devolucoes.custoDevolvido;
  const ticketMedio = vendas.length ? totalVendido / vendas.length : 0;

  const formasPagamento = vendas.reduce(
    (acc, venda) => {
      const key = ['dinheiro', 'pix', 'debito', 'credito'].includes(venda.formaPagamento)
        ? venda.formaPagamento
        : 'outros';

      acc[key] = (acc[key] || 0) + venda.total;
      return acc;
    },
    { dinheiro: 0, pix: 0, debito: 0, credito: 0, outros: 0 }
  );

  return {
    totalVendido,
    custoTotal,
    lucroBruto,
    ticketMedio,
    formasPagamento,
    das: { dasEstimado: totalVendido * DAS_PERCENT },
    vendas
  };
}

function relatorioDiario({ data }) {
  const rows = db
    .prepare('SELECT * FROM sales WHERE substr(dataHora, 1, 10) = ? ORDER BY dataHora DESC')
    .all(data);

  return buildReport(rows, devolucoesNoPrefixo('dataHora', data));
}

function relatorioMensal({ ano, mes }) {
  const prefix = `${ano}-${String(mes).padStart(2, '0')}`;

  const rows = db
    .prepare("SELECT * FROM sales WHERE substr(dataHora, 1, 7) = ? ORDER BY dataHora DESC")
    .all(prefix);

  return buildReport(rows, devolucoesNoPrefixo('dataHora', prefix));
}

function relatorioAnual({ ano }) {
  const rows = db
    .prepare("SELECT * FROM sales WHERE substr(dataHora, 1, 4) = ? ORDER BY dataHora DESC")
    .all(String(ano));

  return buildReport(rows, devolucoesNoPrefixo('dataHora', String(ano)));
}

function listarVendas(params = {}) {
  let query = 'SELECT * FROM sales';
  const clauses = [];
  const values = [];

  if (params.data) {
    clauses.push('substr(dataHora, 1, 10) = ?');
    values.push(params.data);
  }

  if (clauses.length) {
    query += ` WHERE ${clauses.join(' AND ')}`;
  }

  query += ' ORDER BY dataHora DESC';

  return db.prepare(query).all(...values).map(toVenda);
}

module.exports = { relatorioDiario, relatorioMensal, relatorioAnual, listarVendas };
