import { query } from '../config/db.js';
import { centavosParaDecimal } from './regras/dinheiro.js';

// Criadas automaticamente no cadastro do usuário.
export const FONTES_DESTINOS_PADRAO = [
  { nome: 'Conta corrente', tipo: 'conta' },
  { nome: 'Carteira', tipo: 'conta' },
  { nome: 'Salário', tipo: 'renda' },
];

const SELECT_FONTE = `
  SELECT f.id, f.nome, f.tipo,
         f.dia_fechamento AS "diaFechamento", f.dia_vencimento AS "diaVencimento",
         f.limite, f.reserva,
         (SELECT COUNT(*) FROM lancamentos l WHERE l.fonte_destino_id = f.id) AS "totalLancamentos"
    FROM fontes_destinos f`;

const decimalOuNulo = (centavos) => (centavos === null ? null : centavosParaDecimal(centavos));

export async function criarFontesDestinosPadrao(usuarioId, cliente) {
  for (const fonte of FONTES_DESTINOS_PADRAO) {
    await cliente.query(
      'INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
      [usuarioId, fonte.nome, fonte.tipo],
    );
  }
}

export async function listar(usuarioId) {
  const { rows } = await query(
    `${SELECT_FONTE} WHERE f.usuario_id = $1
      ORDER BY CASE f.tipo WHEN 'renda' THEN 1 WHEN 'conta' THEN 2 ELSE 3 END, lower(f.nome)`,
    [usuarioId],
  );
  return rows;
}

export async function buscarPorId(usuarioId, id) {
  const { rows } = await query(`${SELECT_FONTE} WHERE f.id = $1 AND f.usuario_id = $2`, [id, usuarioId]);
  return rows[0] ?? null;
}

export async function criar(usuarioId, dados) {
  const { rows } = await query(
    `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [usuarioId, dados.nome, dados.tipo, dados.diaFechamento, dados.diaVencimento,
      decimalOuNulo(dados.limiteCentavos), dados.reserva],
  );
  return buscarPorId(usuarioId, rows[0].id);
}

export async function atualizar(usuarioId, id, dados) {
  const { rowCount } = await query(
    `UPDATE fontes_destinos
        SET nome = $1, tipo = $2, dia_fechamento = $3, dia_vencimento = $4, limite = $5, reserva = $6
      WHERE id = $7 AND usuario_id = $8`,
    [dados.nome, dados.tipo, dados.diaFechamento, dados.diaVencimento,
      decimalOuNulo(dados.limiteCentavos), dados.reserva, id, usuarioId],
  );
  return rowCount > 0 ? buscarPorId(usuarioId, id) : null;
}

export async function excluir(usuarioId, id) {
  const { rowCount } = await query('DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rowCount > 0;
}
