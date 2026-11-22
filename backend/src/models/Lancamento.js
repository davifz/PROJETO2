// Tabela "Lançamentos"
import { randomUUID } from 'node:crypto';
import { query, transacao } from '../config/db.js';
import { calcularFatura } from './regras/faturas.js';
import { centavosParaDecimal, dividirEmParcelas } from './regras/dinheiro.js';

const SELECT_LANCAMENTO = `
  SELECT l.id, l.tipo, l.descricao, l.valor, l.data,
         l.categoria_id AS "categoriaId", c.nome AS "categoriaNome",
         l.fonte_destino_id AS "fonteDestinoId", f.nome AS "fonteDestinoNome", f.tipo AS "fonteDestinoTipo",
         f.dia_fechamento AS "diaFechamento", f.dia_vencimento AS "diaVencimento",
         l.parcela_atual AS "parcelaAtual", l.total_parcelas AS "totalParcelas",
         l.grupo_parcelamento AS "grupoParcelamento"
    FROM lancamentos l
    JOIN categorias c      ON c.id = l.categoria_id
    JOIN fontes_destinos f ON f.id = l.fonte_destino_id`;

const ORDENACAO = 'ORDER BY l.data DESC, l.criado_em DESC, l.parcela_atual ASC, l.id DESC';

// Acrescenta a fatura em que o lançamento cai (só para cartão de crédito).
function formatar(linha) {
  const { diaFechamento, diaVencimento, ...lancamento } = linha;
  lancamento.fatura = linha.fonteDestinoTipo === 'cartao_credito'
    ? calcularFatura(linha.data, { diaFechamento, diaVencimento }, linha.parcelaAtual)
    : null;
  return lancamento;
}

// Monta o WHERE dos filtros da listagem, sempre parametrizado.
function montarFiltros(usuarioId, filtros) {
  const condicoes = ['l.usuario_id = $1', 'l.data BETWEEN $2 AND $3'];
  const parametros = [usuarioId, filtros.inicio, filtros.fim];
  const adicionar = (sql, valor) => {
    parametros.push(valor);
    condicoes.push(`${sql} $${parametros.length}`);
  };
  if (filtros.tipo) adicionar('l.tipo =', filtros.tipo);
  if (filtros.categoriaId) adicionar('l.categoria_id =', filtros.categoriaId);
  if (filtros.fonteDestinoId) adicionar('l.fonte_destino_id =', filtros.fonteDestinoId);
  return { where: condicoes.join(' AND '), parametros };
}

export async function listar(usuarioId, filtros) {
  const { where, parametros } = montarFiltros(usuarioId, filtros);

  // Totais do período filtrado, calculados no banco.
  const totais = await query(
    `SELECT COUNT(*) AS quantidade,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)   AS saidas,
            COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0) AS saldo
       FROM lancamentos l
      WHERE ${where}`,
    parametros,
  );

  const deslocamento = (filtros.pagina - 1) * filtros.porPagina;
  const itens = await query(
    `${SELECT_LANCAMENTO} WHERE ${where} ${ORDENACAO}
      LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
    [...parametros, filtros.porPagina, deslocamento],
  );

  const { quantidade, entradas, saidas, saldo } = totais.rows[0];
  return {
    periodo: { inicio: filtros.inicio, fim: filtros.fim },
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    totalItens: quantidade,
    totalPaginas: Math.max(1, Math.ceil(quantidade / filtros.porPagina)),
    totais: { entradas, saidas, saldo },
    itens: itens.rows.map(formatar),
  };
}

export async function buscarPorId(usuarioId, id) {
  const { rows } = await query(`${SELECT_LANCAMENTO} WHERE l.id = $1 AND l.usuario_id = $2`, [id, usuarioId]);
  return rows[0] ? formatar(rows[0]) : null;
}

// Cria o lançamento. Com totalParcelas > 1, gera uma linha por parcela, todas com
// o mesmo grupo_parcelamento e a mesma data da compra. A diferença de centavos
// vai para a 1ª parcela. Tudo dentro de uma transação: grava todas ou nenhuma.
export async function criar(usuarioId, dados) {
  const { tipo, descricao, valorCentavos, data, categoriaId, fonteDestinoId, totalParcelas } = dados;
  const grupo = totalParcelas > 1 ? randomUUID() : null;
  const valores = dividirEmParcelas(valorCentavos, totalParcelas);

  const primeiroId = await transacao(async (cliente) => {
    let idPrimeira = null;
    for (let i = 0; i < totalParcelas; i++) {
      const { rows } = await cliente.query(
        `INSERT INTO lancamentos
           (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
            parcela_atual, total_parcelas, grupo_parcelamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [usuarioId, tipo, descricao, centavosParaDecimal(valores[i]), data, categoriaId,
          fonteDestinoId, i + 1, totalParcelas, grupo],
      );
      if (i === 0) idPrimeira = rows[0].id;
    }
    return idPrimeira;
  });

  const { rows } = grupo
    ? await query(`${SELECT_LANCAMENTO} WHERE l.usuario_id = $1 AND l.grupo_parcelamento = $2
                   ORDER BY l.parcela_atual`, [usuarioId, grupo])
    : await query(`${SELECT_LANCAMENTO} WHERE l.usuario_id = $1 AND l.id = $2`, [usuarioId, primeiroId]);

  return { grupoParcelamento: grupo, lancamentos: rows.map(formatar) };
}

// Atualiza um lançamento. Numa compra parcelada, os dados da COMPRA (tipo,
// descrição, data, categoria e cartão) valem para todas as parcelas; o valor é
// de cada parcela e muda só na editada.
export async function atualizar(usuarioId, existente, dados) {
  await transacao(async (cliente) => {
    await cliente.query(
      'UPDATE lancamentos SET valor = $1 WHERE id = $2 AND usuario_id = $3',
      [centavosParaDecimal(dados.valorCentavos), existente.id, usuarioId],
    );
    const alvo = existente.grupoParcelamento
      ? { sql: 'grupo_parcelamento = $6', valor: existente.grupoParcelamento }
      : { sql: 'id = $6', valor: existente.id };
    await cliente.query(
      `UPDATE lancamentos
          SET tipo = $1, descricao = $2, data = $3, categoria_id = $4, fonte_destino_id = $5
        WHERE ${alvo.sql} AND usuario_id = $7`,
      [dados.tipo, dados.descricao, dados.data, dados.categoriaId, dados.fonteDestinoId, alvo.valor, usuarioId],
    );
  });
  return buscarPorId(usuarioId, existente.id);
}

// Exclui só o lançamento ou, com todasParcelas, todas as parcelas da compra.
export async function excluir(usuarioId, existente, todasParcelas) {
  const { rowCount } = todasParcelas && existente.grupoParcelamento
    ? await query('DELETE FROM lancamentos WHERE grupo_parcelamento = $1 AND usuario_id = $2',
      [existente.grupoParcelamento, usuarioId])
    : await query('DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2', [existente.id, usuarioId]);
  return rowCount;
}
