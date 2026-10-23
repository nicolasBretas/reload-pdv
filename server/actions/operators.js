const { db } = require('../db');

function toOperator(row) {
  return {
    id: row.id,
    nome: row.nome,
    perfil: row.perfil
  };
}

function loginOperador({ pin }) {
  if (!pin) {
    throw new Error('Informe o PIN do operador.');
  }

  const row = db
    .prepare('SELECT * FROM operators WHERE pin = ? AND ativo = 1')
    .get(String(pin).trim());

  if (!row) {
    throw new Error('PIN inválido ou operador inativo.');
  }

  return toOperator(row);
}

function listarOperadores() {
  const rows = db.prepare('SELECT * FROM operators WHERE ativo = 1 ORDER BY nome').all();
  return rows.map(toOperator);
}

function requireAdminPin(pin) {
  if (!pin) {
    throw new Error('PIN de administrador é obrigatório.');
  }

  const row = db
    .prepare("SELECT * FROM operators WHERE pin = ? AND perfil = 'admin' AND ativo = 1")
    .get(String(pin).trim());

  if (!row) {
    throw new Error('PIN de administrador inválido.');
  }

  return toOperator(row);
}

module.exports = { loginOperador, listarOperadores, requireAdminPin };
