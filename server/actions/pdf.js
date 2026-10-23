const path = require('node:path');
const { db, DATA_DIR } = require('../db');
const { generateId } = require('../ids');
const { renderMonthlyReportPdf, renderDailyClosingPdf } = require('../lib/pdf');
const { relatorioMensal, relatorioDiario } = require('./reports');
const { obterCaixaDia } = require('./cash');

function toPdfReport(row) {
  return {
    arquivoNome: row.arquivoNome,
    tipo: row.tipo,
    periodo: row.periodo,
    dataHora: row.dataHora,
    geradoPor: row.geradoPor || '',
    status: row.status,
    url: `/pdfs/${row.arquivoNome}`
  };
}

async function gerarPdfMensal({ ano, mes, operadorNome }) {
  const periodo = `${ano}-${String(mes).padStart(2, '0')}`;
  const arquivoNome = `relatorio-mensal-${periodo}-${Date.now()}.pdf`;
  const filePath = path.join(DATA_DIR, 'pdfs', arquivoNome);

  const report = relatorioMensal({ ano, mes });

  await renderMonthlyReportPdf(filePath, { ano, mes, report, geradoPor: operadorNome });

  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO pdf_reports (id, arquivoNome, tipo, periodo, dataHora, geradoPor, status, caminho)
     VALUES (?, ?, 'mensal', ?, ?, ?, 'OK', ?)`
  ).run(generateId('PDF'), arquivoNome, periodo, now, operadorNome || '', filePath);

  return { url: `/pdfs/${arquivoNome}` };
}

async function gerarPdfFechamentoDiario({ data, operadorNome }) {
  const arquivoNome = `fechamento-diario-${data}-${Date.now()}.pdf`;
  const filePath = path.join(DATA_DIR, 'pdfs', arquivoNome);

  const { caixa, resumoVendas } = obterCaixaDia({ data });
  const report = relatorioDiario({ data });

  await renderDailyClosingPdf(filePath, { data, caixa, resumoVendas, report, geradoPor: operadorNome });

  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO pdf_reports (id, arquivoNome, tipo, periodo, dataHora, geradoPor, status, caminho)
     VALUES (?, ?, 'fechamento_diario', ?, ?, ?, 'OK', ?)`
  ).run(generateId('PDF'), arquivoNome, data, now, operadorNome || '', filePath);

  return { url: `/pdfs/${arquivoNome}` };
}

function listarRelatoriosPDF() {
  const rows = db.prepare('SELECT * FROM pdf_reports ORDER BY dataHora DESC').all();
  return rows.map(toPdfReport);
}

module.exports = { gerarPdfMensal, gerarPdfFechamentoDiario, listarRelatoriosPDF };
