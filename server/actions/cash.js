const { db } = require('../db');
const { generateId } = require('../ids');
const { requireAdminPin } = require('./operators');

const PAYMENT_KEYS = ['dinheiro', 'pix', 'debito', 'credito', 'outros'];

function resumoVendasDoDia(data) {
  const rows = db
    .prepare("SELECT formaPagamento, SUM(total) AS total FROM sales WHERE substr(dataHora, 1, 10) = ? GROUP BY formaPagamento")
    .all(data);

  const formas = PAYMENT_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  let totalVendas = 0;

  for (const row of rows) {
    const key = PAYMENT_KEYS.includes(row.formaPagamento) ? row.formaPagamento : 'outros';
    formas[key] += Number(row.total);
    totalVendas += Number(row.total);
  }

  return { formas, totalVendas };
}

const MOVEMENT_TYPES = ['sangria', 'suprimento', 'despesa'];

function toMovimento(row) {
  return {
    id: row.id,
    data: row.data,
    tipo: row.tipo,
    valor: Number(row.valor),
    motivo: row.motivo || '',
    operadorNome: row.operadorNome || '',
    dataHora: row.dataHora
  };
}

function resumoMovimentosDoDia(data) {
  const rows = db
    .prepare('SELECT tipo, SUM(valor) AS total FROM cash_movements WHERE data = ? GROUP BY tipo')
    .all(data);

  const resumo = { sangria: 0, suprimento: 0, despesa: 0 };

  for (const row of rows) {
    if (resumo[row.tipo] !== undefined) {
      resumo[row.tipo] = Number(row.total);
    }
  }

  return resumo;
}

function registrarMovimentoCaixa({ data, tipo, valor, motivo, operadorNome, adminPin }) {
  const targetDate = data || new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT * FROM cash_days WHERE data = ?').get(targetDate);

  if (!row || row.status !== 'aberto') {
    throw new Error('Não há caixa aberto para esta data.');
  }

  if (!MOVEMENT_TYPES.includes(tipo)) {
    throw new Error('Tipo de movimentação inválido.');
  }

  const valorNumber = Number(valor || 0);

  if (valorNumber <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }

  if (tipo === 'sangria') {
    requireAdminPin(adminPin);
  }

  const id = generateId('MOV');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO cash_movements (id, data, tipo, valor, motivo, operadorNome, dataHora)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, targetDate, tipo, valorNumber, motivo || '', operadorNome || '', now);

  return toMovimento(db.prepare('SELECT * FROM cash_movements WHERE id = ?').get(id));
}

function listarMovimentosCaixa({ data }) {
  const targetDate = data || new Date().toISOString().slice(0, 10);

  return db
    .prepare('SELECT * FROM cash_movements WHERE data = ? ORDER BY dataHora DESC')
    .all(targetDate)
    .map(toMovimento);
}

function toCaixa(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    data: row.data,
    status: row.status,
    saldoInicial: Number(row.saldoInicial),
    saldoInformado: row.saldoInformado === null ? null : Number(row.saldoInformado),
    sangrias: Number(row.sangrias),
    despesas: Number(row.despesas),
    diferenca: row.diferenca === null ? null : Number(row.diferenca),
    operadorAbertura: row.operadorAbertura || '',
    operadorFechamento: row.operadorFechamento || '',
    dataHoraAbertura: row.dataHoraAbertura,
    dataHoraFechamento: row.dataHoraFechamento,
    observacaoAbertura: row.observacaoAbertura || '',
    observacaoFechamento: row.observacaoFechamento || ''
  };
}

function abrirCaixa({ data, saldoInicial, observacao, operadorNome }) {
  const existing = db.prepare('SELECT * FROM cash_days WHERE data = ?').get(data);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(
      "UPDATE cash_days SET status = 'aberto', saldoInicial = ?, observacaoAbertura = ?, operadorAbertura = ?, dataHoraAbertura = ? WHERE data = ?"
    ).run(Number(saldoInicial || 0), observacao || '', operadorNome || '', now, data);
  } else {
    db.prepare(
      `INSERT INTO cash_days (id, data, status, saldoInicial, sangrias, despesas, operadorAbertura, dataHoraAbertura, observacaoAbertura)
       VALUES (?, ?, 'aberto', ?, 0, 0, ?, ?, ?)`
    ).run(generateId('CX'), data, Number(saldoInicial || 0), operadorNome || '', now, observacao || '');
  }

  return toCaixa(db.prepare('SELECT * FROM cash_days WHERE data = ?').get(data));
}

function obterCaixaDia({ data }) {
  const targetDate = data || new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT * FROM cash_days WHERE data = ?').get(targetDate);

  return {
    caixa: toCaixa(row),
    caixaAberto: Boolean(row && row.status === 'aberto'),
    resumoVendas: resumoVendasDoDia(targetDate),
    movimentos: listarMovimentosCaixa({ data: targetDate }),
    movimentosResumo: resumoMovimentosDoDia(targetDate)
  };
}

function fecharCaixa({ data, sangrias, despesas, saldoInformado, observacao, adminPin }) {
  requireAdminPin(adminPin);

  const row = db.prepare('SELECT * FROM cash_days WHERE data = ?').get(data);

  if (!row || row.status !== 'aberto') {
    throw new Error('Não há caixa aberto para esta data.');
  }

  const resumo = resumoVendasDoDia(data);
  const movimentos = resumoMovimentosDoDia(data);
  const sangriasValue = Number(sangrias || 0);
  const despesasValue = Number(despesas || 0);
  const saldoInformadoValue = Number(saldoInformado || 0);
  const saldoEsperado =
    Number(row.saldoInicial) + movimentos.suprimento + resumo.formas.dinheiro - sangriasValue - despesasValue;
  const diferenca = saldoInformadoValue - saldoEsperado;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE cash_days SET status = 'fechado', sangrias = ?, despesas = ?, saldoInformado = ?, diferenca = ?,
       observacaoFechamento = ?, dataHoraFechamento = ? WHERE data = ?`
  ).run(sangriasValue, despesasValue, saldoInformadoValue, diferenca, observacao || '', now, data);

  return { caixa: toCaixa(db.prepare('SELECT * FROM cash_days WHERE data = ?').get(data)) };
}

module.exports = {
  abrirCaixa,
  obterCaixaDia,
  fecharCaixa,
  resumoVendasDoDia,
  registrarMovimentoCaixa,
  listarMovimentosCaixa
};
