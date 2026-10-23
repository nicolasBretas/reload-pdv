const { db } = require('../db');
const { generateId } = require('../ids');
const { getLanAddresses } = require('../lib/network');

const EMPRESA_NOME = 'Reload';
const SYSTEM_VERSION = '1.1.3';
const PORT = process.env.PORT || 3100;

function ping() {
  return { ok: true, horario: new Date().toISOString() };
}

function config() {
  return {
    empresaNome: EMPRESA_NOME,
    versaoSistema: SYSTEM_VERSION,
    enderecosRede: getLanAddresses(PORT)
  };
}

function health() {
  const estoqueNegativo = db
    .prepare('SELECT COUNT(*) AS total FROM products WHERE arquivado = 0 AND quantidade < 0')
    .get().total;

  const produtosSemPreco = db
    .prepare('SELECT COUNT(*) AS total FROM products WHERE arquivado = 0 AND venda <= 0')
    .get().total;

  const produtosZerados = db
    .prepare('SELECT COUNT(*) AS total FROM products WHERE arquivado = 0 AND quantidade = 0')
    .get().total;

  const hoje = new Date().toISOString().slice(0, 10);
  const caixaHoje = db
    .prepare("SELECT status FROM cash_days WHERE data = ?")
    .get(hoje);

  const tabelas = [
    { sheet: 'operators', label: 'Operadores' },
    { sheet: 'products', label: 'Produtos' },
    { sheet: 'clients', label: 'Clientes' },
    { sheet: 'orders', label: 'Pedidos' },
    { sheet: 'sales', label: 'Vendas' },
    { sheet: 'cash_days', label: 'Caixa' }
  ];

  const checks = tabelas.map(tabela => {
    try {
      const total = db.prepare(`SELECT COUNT(*) AS total FROM ${tabela.sheet}`).get().total;

      return {
        sheet: tabela.label,
        status: 'OK',
        mensagem: `${total} registro(s).`
      };
    } catch (error) {
      return { sheet: tabela.label, status: 'ERRO', mensagem: error.message };
    }
  });

  return {
    status: 'OK',
    empresaNome: EMPRESA_NOME,
    versaoSistema: SYSTEM_VERSION,
    apiTokenConfigurado: false,
    exigirLogin: true,
    exigirApiToken: false,
    alertas: {
      estoqueNegativo,
      produtosSemPreco,
      produtosZerados,
      caixaHojeAberto: Boolean(caixaHoje && caixaHoje.status === 'aberto')
    },
    checks
  };
}

function registrarLog(log) {
  db.prepare(
    `INSERT INTO logs (id, nivel, origem, acao, mensagem, detalhes, usuario, dataHora)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    generateId('LOG'),
    log.nivel || 'INFO',
    log.origem || '',
    log.acao || '',
    log.mensagem || '',
    log.detalhes || '',
    log.usuario || '',
    new Date().toISOString()
  );

  return { ok: true };
}

function listarLogs() {
  return db.prepare('SELECT * FROM logs ORDER BY dataHora DESC LIMIT 200').all();
}

module.exports = { ping, config, health, registrarLog, listarLogs };
