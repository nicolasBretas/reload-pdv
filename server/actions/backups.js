const path = require('node:path');
const fs = require('node:fs');
const { db, DATA_DIR, DB_PATH } = require('../db');
const { generateId } = require('../ids');

function toBackup(row) {
  return {
    arquivoNome: row.arquivoNome,
    dataHora: row.dataHora,
    criadoPor: row.criadoPor || '',
    status: row.status,
    mensagem: row.mensagem || '',
    url: `/backups/${row.arquivoNome}`
  };
}

function backupManual({ criadoPor }) {
  const arquivoNome = `reload-backup-${Date.now()}.db`;
  const filePath = path.join(DATA_DIR, 'backups', arquivoNome);
  const now = new Date().toISOString();

  let status = 'OK';
  let mensagem = 'Backup gerado com sucesso.';

  try {
    fs.copyFileSync(DB_PATH, filePath);
  } catch (error) {
    status = 'ERRO';
    mensagem = error.message;
  }

  db.prepare(
    `INSERT INTO backups (id, arquivoNome, dataHora, criadoPor, status, mensagem, caminho)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(generateId('BKP'), arquivoNome, now, criadoPor || '', status, mensagem, filePath);

  if (status === 'ERRO') {
    throw new Error(mensagem);
  }

  return { url: `/backups/${arquivoNome}` };
}

function listarBackups() {
  const rows = db.prepare('SELECT * FROM backups ORDER BY dataHora DESC').all();
  return rows.map(toBackup);
}

module.exports = { backupManual, listarBackups };
