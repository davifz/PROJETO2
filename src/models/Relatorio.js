import { query } from '../config/db.js';
import { periodoAnterior } from './regras/datas.js';
import { arredondar2 } from './regras/dinheiro.js';

const percentual = (parte, total) => (total > 0 ? arredondar2((parte / total) * 100) : 0);

function tendencia(atual, anterior) {
  if (atual > anterior) return 'aumento';
  if (atual < anterior) return 'reducao';
  return 'estavel';
}

export async function porCategoria(usuarioId, inicio, fim) {
  const anterior = periodoAnterior(inicio, fim);
  // $1 usuário | $2..$3 período escolhido | $4..$5 período anterior
  const parametros = [usuarioId, inicio, fim, anterior.inicio, anterior.fim];

  const porCategoriaSql = await query(
    `SELECT c.id, c.nome, c.tipo,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $2 AND $3), 0) AS total,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $4 AND $5), 0) AS "periodoAnterior"
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1
        AND l.data BETWEEN $4 AND $3
      GROUP BY c.id, c.nome, c.tipo
      ORDER BY total DESC, "periodoAnterior" DESC, c.nome`,
    parametros,
  );

  const totaisSql = await query(
    `SELECT l.tipo,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $2 AND $3), 0) AS total,
            COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $4 AND $5), 0) AS "periodoAnterior"
       FROM lancamentos l
      WHERE l.usuario_id = $1
        AND l.data BETWEEN $4 AND $3
      GROUP BY l.tipo`,
    parametros,
  );

  const totais = { entrada: { total: 0, periodoAnterior: 0 }, saida: { total: 0, periodoAnterior: 0 } };
  for (const linha of totaisSql.rows) totais[linha.tipo] = linha;

  const montar = (linha, totalDoTipo) => ({
    id: linha.id,
    nome: linha.nome,
    total: linha.total,
    percentual: percentual(linha.total, totalDoTipo),
    periodoAnterior: linha.periodoAnterior,
    variacao: linha.periodoAnterior > 0
      ? arredondar2(((linha.total - linha.periodoAnterior) / linha.periodoAnterior) * 100)
      : null,
    tendencia: tendencia(linha.total, linha.periodoAnterior),
  });

  return {
    periodo: { inicio, fim },
    periodoAnterior: anterior,
    totalSaidas: totais.saida.total,
    totalSaidasAnterior: totais.saida.periodoAnterior,
    totalEntradas: totais.entrada.total,
    totalEntradasAnterior: totais.entrada.periodoAnterior,
    categorias: porCategoriaSql.rows
      .filter((linha) => linha.tipo === 'saida')
      .map((linha) => montar(linha, totais.saida.total)),
    entradas: porCategoriaSql.rows
      .filter((linha) => linha.tipo === 'entrada')
      .map((linha) => montar(linha, totais.entrada.total)),
  };
}

export async function porFonteDestino(usuarioId, inicio, fim) {
  const { rows } = await query(
    `SELECT f.id, f.nome, f.tipo, f.reserva,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)   AS saidas,
            COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0) AS saldo
       FROM fontes_destinos f
       LEFT JOIN lancamentos l
              ON l.fonte_destino_id = f.id
             AND l.usuario_id = $1
             AND l.data BETWEEN $2 AND $3
      WHERE f.usuario_id = $1
      GROUP BY f.id, f.nome, f.tipo, f.reserva
      ORDER BY f.nome`,
    [usuarioId, inicio, fim],
  );

  const totalEntradas = rows.reduce((soma, linha) => soma + Math.round(linha.entradas * 100), 0) / 100;
  const totalSaidas = rows.reduce((soma, linha) => soma + Math.round(linha.saidas * 100), 0) / 100;

  const fontes = rows
    .filter((linha) => linha.entradas > 0)
    .sort((a, b) => b.entradas - a.entradas)
    .map((linha) => ({
      id: linha.id, nome: linha.nome, tipo: linha.tipo,
      total: linha.entradas, percentual: percentual(linha.entradas, totalEntradas),
    }));

  const destinos = rows
    .filter((linha) => linha.saidas > 0)
    .sort((a, b) => b.saidas - a.saidas)
    .map((linha) => ({
      id: linha.id, nome: linha.nome, tipo: linha.tipo,
      total: linha.saidas, percentual: percentual(linha.saidas, totalSaidas),
    }));

  const contas = rows
    .filter((linha) => linha.tipo === 'conta')
    .map((linha) => ({
      id: linha.id, nome: linha.nome, reserva: linha.reserva,
      entradas: linha.entradas, saidas: linha.saidas, saldo: linha.saldo,
    }));

  return {
    periodo: { inicio, fim },
    totalEntradas,
    totalSaidas,
    saldo: Math.round((totalEntradas - totalSaidas) * 100) / 100,
    fontes,
    destinos,
    contas,
    itens: rows
      .filter((linha) => linha.entradas > 0 || linha.saidas > 0)
      .map(({ id, nome, tipo, entradas, saidas, saldo }) => ({ id, nome, tipo, entradas, saidas, saldo })),
  };
}
