// Acesso à tabela categorias. Toda consulta filtra por usuario_id (RF3).
import { query, transacao } from '../config/db.js';

// Criadas automaticamente no cadastro do usuário.
// grupo: classificação para a regra 50/30/20 da página de saúde financeira.
export const CATEGORIAS_PADRAO = [
  { nome: 'Salário', tipo: 'entrada', grupo: null },
  { nome: 'Outras receitas', tipo: 'entrada', grupo: null },
  { nome: 'Alimentação', tipo: 'saida', grupo: 'necessidade' },
  { nome: 'Moradia', tipo: 'saida', grupo: 'necessidade' },
  { nome: 'Saúde', tipo: 'saida', grupo: 'necessidade' },
  { nome: 'Mobilidade', tipo: 'saida', grupo: 'necessidade' },
  { nome: 'Educação', tipo: 'saida', grupo: 'necessidade' },
  { nome: 'Lazer', tipo: 'saida', grupo: 'desejo' },
  { nome: 'Compras', tipo: 'saida', grupo: 'desejo' },
  { nome: 'Investimentos', tipo: 'saida', grupo: 'poupanca' },
  { nome: 'Outros', tipo: 'saida', grupo: 'desejo' },
];

const SELECT_CATEGORIA = `
  SELECT c.id, c.nome, c.tipo, c.grupo_orcamento AS "grupoOrcamento",
         (SELECT COUNT(*) FROM lancamentos l WHERE l.categoria_id = c.id) AS "totalLancamentos"
    FROM categorias c`;

// `cliente` permite rodar dentro da transação do cadastro.
export async function criarCategoriasPadrao(usuarioId, cliente) {
  for (const categoria of CATEGORIAS_PADRAO) {
    await cliente.query(
      'INSERT INTO categorias (usuario_id, nome, tipo, grupo_orcamento) VALUES ($1, $2, $3, $4)',
      [usuarioId, categoria.nome, categoria.tipo, categoria.grupo],
    );
  }
}

export async function listar(usuarioId, tipo = null) {
  const parametros = [usuarioId];
  let filtroTipo = '';
  if (tipo) {
    parametros.push(tipo);
    filtroTipo = 'AND c.tipo = $2';
  }
  const { rows } = await query(
    `${SELECT_CATEGORIA} WHERE c.usuario_id = $1 ${filtroTipo} ORDER BY c.tipo, lower(c.nome)`,
    parametros,
  );
  return rows;
}

export async function buscarPorId(usuarioId, id) {
  const { rows } = await query(`${SELECT_CATEGORIA} WHERE c.id = $1 AND c.usuario_id = $2`, [id, usuarioId]);
  return rows[0] ?? null;
}

export async function criar(usuarioId, { nome, tipo, grupoOrcamento }) {
  const { rows } = await query(
    `INSERT INTO categorias (usuario_id, nome, tipo, grupo_orcamento)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, tipo, grupo_orcamento AS "grupoOrcamento", 0 AS "totalLancamentos"`,
    [usuarioId, nome, tipo, grupoOrcamento],
  );
  return rows[0];
}

export async function atualizar(usuarioId, id, { nome, tipo, grupoOrcamento }) {
  const { rowCount } = await query(
    `UPDATE categorias SET nome = $1, tipo = $2, grupo_orcamento = $3
      WHERE id = $4 AND usuario_id = $5`,
    [nome, tipo, grupoOrcamento, id, usuarioId],
  );
  return rowCount > 0 ? buscarPorId(usuarioId, id) : null;
}

export async function excluir(usuarioId, id) {
  const { rowCount } = await query('DELETE FROM categorias WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rowCount > 0;
}

// Alternativa à recusa da exclusão: move os lançamentos para outra categoria
// (do mesmo usuário e tipo) e então exclui — tudo na mesma transação.
export async function moverLancamentosEExcluir(usuarioId, id, destinoId) {
  return transacao(async (cliente) => {
    const movidos = await cliente.query(
      'UPDATE lancamentos SET categoria_id = $1 WHERE categoria_id = $2 AND usuario_id = $3',
      [destinoId, id, usuarioId],
    );
    await cliente.query('DELETE FROM categorias WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
    return movidos.rowCount;
  });
}
