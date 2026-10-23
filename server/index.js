const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { DATA_DIR } = require('./db');

const operators = require('./actions/operators');
const products = require('./actions/products');
const clients = require('./actions/clients');
const orders = require('./actions/orders');
const cash = require('./actions/cash');
const reports = require('./actions/reports');
const pdf = require('./actions/pdf');
const backups = require('./actions/backups');
const diagnostics = require('./actions/diagnostics');
const returns = require('./actions/returns');
const suppliers = require('./actions/suppliers');
const stock = require('./actions/stock');
const { getLanAddresses } = require('./lib/network');

const PROJECT_ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3100;
const HOST = process.env.HOST || '0.0.0.0';

const ACTIONS = {
  ping: diagnostics.ping,
  health: diagnostics.health,
  config: diagnostics.config,
  registrarLog: diagnostics.registrarLog,
  listarLogs: diagnostics.listarLogs,

  loginOperador: operators.loginOperador,
  listarOperadores: operators.listarOperadores,

  listarProdutos: products.listarProdutos,
  adicionarProduto: products.adicionarProduto,
  editarProduto: products.editarProduto,
  arquivarProduto: products.arquivarProduto,

  listarClientes: clients.listarClientes,
  adicionarCliente: clients.adicionarCliente,
  editarCliente: clients.editarCliente,
  arquivarCliente: clients.arquivarCliente,

  criarPedido: orders.criarPedido,
  listarPedidosAbertos: orders.listarPedidosAbertos,
  obterPedido: orders.obterPedido,
  adicionarItemPedido: orders.adicionarItemPedido,
  aplicarDescontoItem: orders.aplicarDescontoItem,
  removerItemPedido: orders.removerItemPedido,
  cancelarPedido: orders.cancelarPedido,
  finalizarPedido: orders.finalizarPedido,

  abrirCaixa: cash.abrirCaixa,
  obterCaixaDia: cash.obterCaixaDia,
  fecharCaixa: cash.fecharCaixa,
  registrarMovimentoCaixa: cash.registrarMovimentoCaixa,
  listarMovimentosCaixa: cash.listarMovimentosCaixa,

  listarVendas: reports.listarVendas,
  relatorioDiario: reports.relatorioDiario,
  relatorioMensal: reports.relatorioMensal,
  relatorioAnual: reports.relatorioAnual,

  gerarPdfMensal: pdf.gerarPdfMensal,
  gerarPdfFechamentoDiario: pdf.gerarPdfFechamentoDiario,
  listarRelatoriosPDF: pdf.listarRelatoriosPDF,

  backupManual: backups.backupManual,
  listarBackups: backups.listarBackups,

  buscarVendaParaDevolucao: returns.buscarVendaParaDevolucao,
  registrarDevolucao: returns.registrarDevolucao,
  listarDevolucoes: returns.listarDevolucoes,

  listarFornecedores: suppliers.listarFornecedores,
  adicionarFornecedor: suppliers.adicionarFornecedor,
  editarFornecedor: suppliers.editarFornecedor,
  arquivarFornecedor: suppliers.arquivarFornecedor,

  registrarEntradaEstoque: stock.registrarEntradaEstoque,
  listarEntradasEstoque: stock.listarEntradasEstoque
};

const app = express();

app.use(express.text({ limit: '5mb' }));

app.use((req, res, next) => {
  if (req.path.startsWith('/data') || req.path.startsWith('/server')) {
    return res.status(404).end();
  }

  next();
});

app.use('/pdfs', express.static(path.join(DATA_DIR, 'pdfs')));
app.use('/backups', express.static(path.join(DATA_DIR, 'backups')));

async function handleAction(action, params, res) {
  const handler = ACTIONS[action];

  if (!handler) {
    res.json({ success: false, error: `Ação desconhecida: ${action}` });
    return;
  }

  try {
    const data = await handler(params || {});
    res.json({ success: true, data });
  } catch (error) {
    res.json({ success: false, error: error.message || String(error) });
  }
}

app.get('/exec', (req, res) => {
  const { action, ...params } = req.query;
  handleAction(action, params, res);
});

app.post('/exec', (req, res) => {
  const { action } = req.query;
  let params = {};

  try {
    params = req.body ? JSON.parse(req.body) : {};
  } catch (error) {
    res.json({ success: false, error: 'JSON inválido no corpo da requisição.' });
    return;
  }

  handleAction(action, params, res);
});

app.use(express.static(PROJECT_ROOT));

const BACKUP_RETENTION = 14;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function pruneOldBackups(keep) {
  const dir = path.join(DATA_DIR, 'backups');

  const files = fs
    .readdirSync(dir)
    .map(name => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  files.slice(keep).forEach(file => {
    fs.unlinkSync(path.join(dir, file.name));
  });
}

function runScheduledBackup() {
  try {
    backups.backupManual({ criadoPor: 'Sistema (automático)' });
    pruneOldBackups(BACKUP_RETENTION);
  } catch (error) {
    console.error('Falha no backup automático:', error.message);
  }
}

app.listen(PORT, HOST, () => {
  const lanAddresses = getLanAddresses(PORT);

  console.log(`Reload PDV rodando em http://localhost:${PORT}`);

  if (lanAddresses.length) {
    console.log('Acessível na rede local (Wi-Fi) em:');
    lanAddresses.forEach(address => console.log(`  ${address}`));
  } else {
    console.log('Nenhuma rede local detectada além do localhost.');
  }

  runScheduledBackup();
  setInterval(runScheduledBackup, BACKUP_INTERVAL_MS);
});
