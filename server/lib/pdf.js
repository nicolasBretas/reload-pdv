const fs = require('node:fs');
const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function writePdf(filePath, render) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    render(doc);
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function renderMonthlyReportPdf(filePath, { ano, mes, report, geradoPor }) {
  await writePdf(filePath, doc => {
    doc.fontSize(18).text('Reload PDV — Relatório mensal', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#555').text(`Período: ${String(mes).padStart(2, '0')}/${ano}`);
    doc.text(`Gerado por: ${geradoPor || '--'} em ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(13).text('Resumo');
    doc.fontSize(11);
    doc.text(`Total vendido: ${formatCurrency(report.totalVendido)}`);
    doc.text(`Custo total: ${formatCurrency(report.custoTotal)}`);
    doc.text(`Lucro bruto: ${formatCurrency(report.lucroBruto)}`);
    doc.text(`Ticket médio: ${formatCurrency(report.ticketMedio)}`);
    doc.text(`DAS estimado: ${formatCurrency(report.das.dasEstimado)}`);
    doc.moveDown();

    doc.fontSize(13).text('Formas de pagamento');
    doc.fontSize(11);
    doc.text(`Dinheiro: ${formatCurrency(report.formasPagamento.dinheiro)}`);
    doc.text(`Pix: ${formatCurrency(report.formasPagamento.pix)}`);
    doc.text(`Débito: ${formatCurrency(report.formasPagamento.debito)}`);
    doc.text(`Crédito: ${formatCurrency(report.formasPagamento.credito)}`);
    doc.text(`Outros: ${formatCurrency(report.formasPagamento.outros)}`);
    doc.moveDown();

    doc.fontSize(13).text('Vendas do período');
    doc.fontSize(9);

    report.vendas.forEach(venda => {
      doc.text(
        `${new Date(venda.dataHora).toLocaleString('pt-BR')} • ${venda.pedidoId} • ${venda.clienteNome} • ${venda.formaPagamento} • ${formatCurrency(venda.total)}`
      );
    });

    if (!report.vendas.length) {
      doc.text('Nenhuma venda no período.');
    }
  });
}

async function renderDailyClosingPdf(filePath, { data, caixa, resumoVendas, report, geradoPor }) {
  await writePdf(filePath, doc => {
    doc.fontSize(18).text('Reload PDV — Fechamento diário');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#555').text(`Data: ${data}`);
    doc.text(`Gerado por: ${geradoPor || '--'} em ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(13).text('Caixa');
    doc.fontSize(11);

    if (caixa) {
      doc.text(`Status: ${caixa.status}`);
      doc.text(`Saldo inicial: ${formatCurrency(caixa.saldoInicial)}`);
      doc.text(`Sangrias: ${formatCurrency(caixa.sangrias)}`);
      doc.text(`Despesas: ${formatCurrency(caixa.despesas)}`);

      if (caixa.saldoInformado !== null) {
        doc.text(`Saldo informado: ${formatCurrency(caixa.saldoInformado)}`);
        doc.text(`Diferença: ${formatCurrency(caixa.diferenca)}`);
      }
    } else {
      doc.text('Nenhum caixa registrado para esta data.');
    }

    doc.moveDown();
    doc.fontSize(13).text('Vendas por forma de pagamento');
    doc.fontSize(11);
    doc.text(`Dinheiro: ${formatCurrency(resumoVendas.formas.dinheiro)}`);
    doc.text(`Pix: ${formatCurrency(resumoVendas.formas.pix)}`);
    doc.text(`Débito: ${formatCurrency(resumoVendas.formas.debito)}`);
    doc.text(`Crédito: ${formatCurrency(resumoVendas.formas.credito)}`);
    doc.text(`Outros: ${formatCurrency(resumoVendas.formas.outros)}`);
    doc.text(`Total vendido: ${formatCurrency(resumoVendas.totalVendas)}`);
    doc.moveDown();

    doc.fontSize(13).text('Lucro do dia');
    doc.fontSize(11);
    doc.text(`Custo total: ${formatCurrency(report.custoTotal)}`);
    doc.text(`Lucro bruto: ${formatCurrency(report.lucroBruto)}`);
  });
}

module.exports = { renderMonthlyReportPdf, renderDailyClosingPdf };
