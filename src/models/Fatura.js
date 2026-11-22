import { query } from '../config/db.js';
import { calcularFatura } from './regras/faturas.js';
import { hojeISO } from './regras/datas.js';
import { emCentavos, deCentavos, arredondar2 } from './regras/dinheiro.js';

export async function buscarLancamentosDeCartao(usuarioId) {
  const { rows } = await query(
    `SELECT l.id, l.tipo, l.descricao, l.valor, l.data,
            l.parcela_atual AS "parcelaAtual", l.total_parcelas AS "totalParcelas",
            l.fonte_destino_id AS "fonteDestinoId", c.nome AS "categoriaNome"
       FROM lancamentos l
       JOIN categorias c      ON c.id = l.categoria_id
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = $1
        AND f.tipo = 'cartao_credito'
      ORDER BY l.data, l.id`,
    [usuarioId],
  );
  return rows;
}

export async function buscarCartoes(usuarioId) {
  const { rows } = await query(
    `SELECT id, nome, dia_fechamento AS "diaFechamento", dia_vencimento AS "diaVencimento", limite
       FROM fontes_destinos
      WHERE usuario_id = $1 AND tipo = 'cartao_credito'
      ORDER BY lower(nome)`,
    [usuarioId],
  );
  return rows;
}

// A fechada ainda não vencida (se houver), a aberta e as `meses` seguintes.
export function montarFaturasDoCartao(cartao, lancamentos, meses, hoje) {
  const porReferencia = new Map();
  let comprometidoCentavos = 0;

  for (const lancamento of lancamentos) {
    const fatura = calcularFatura(lancamento.data, cartao, lancamento.parcelaAtual);
    // Saída soma na fatura; entrada no cartão (estorno) abate.
    const centavos = emCentavos(lancamento.valor) * (lancamento.tipo === 'saida' ? 1 : -1);

    // O limite fica comprometido por tudo que ainda não venceu.
    if (fatura.vencimento >= hoje) comprometidoCentavos += centavos;

    if (!porReferencia.has(fatura.referencia)) porReferencia.set(fatura.referencia, []);
    porReferencia.get(fatura.referencia).push({
      id: lancamento.id,
      descricao: lancamento.descricao,
      categoria: lancamento.categoriaNome,
      tipo: lancamento.tipo,
      dataCompra: lancamento.data,
      valor: lancamento.valor,
      parcelaAtual: lancamento.parcelaAtual,
      totalParcelas: lancamento.totalParcelas,
      parcela: lancamento.totalParcelas > 1 ? `${lancamento.parcelaAtual}/${lancamento.totalParcelas}` : null,
      centavos,
    });
  }

  const faturas = [];
  const anterior = calcularFatura(hoje, cartao, 0);          // fatura que fechou por último
  if (anterior.vencimento >= hoje) faturas.push({ ...anterior, status: 'fechada' });
  for (let k = 1; k <= meses + 1; k++) {
    // k = 1: fatura em que uma compra feita hoje entraria (a aberta)
    faturas.push({ ...calcularFatura(hoje, cartao, k), status: k === 1 ? 'aberta' : 'futura' });
  }

  const limiteCentavos = emCentavos(cartao.limite);
  const utilizadoCentavos = Math.max(0, comprometidoCentavos);

  return {
    id: cartao.id,
    nome: cartao.nome,
    diaFechamento: cartao.diaFechamento,
    diaVencimento: cartao.diaVencimento,
    limite: cartao.limite,
    limiteUtilizado: deCentavos(utilizadoCentavos),
    limiteDisponivel: deCentavos(limiteCentavos - utilizadoCentavos),
    percentualUtilizado: limiteCentavos > 0 ? arredondar2((utilizadoCentavos / limiteCentavos) * 100) : 0,
    faturas: faturas.map((fatura) => {
      const itens = porReferencia.get(fatura.referencia) ?? [];
      const totalCentavos = itens.reduce((soma, item) => soma + item.centavos, 0);
      return {
        ...fatura,
        total: deCentavos(totalCentavos),
        lancamentos: itens.map(({ centavos, ...item }) => item),
      };
    }),
  };
}

export async function previsao(usuarioId, meses = 3, hoje = hojeISO()) {
  const cartoes = await buscarCartoes(usuarioId);
  if (cartoes.length === 0) return { hoje, meses, cartoes: [] };

  const lancamentos = await buscarLancamentosDeCartao(usuarioId);
  return {
    hoje,
    meses,
    cartoes: cartoes.map((cartao) => montarFaturasDoCartao(
      cartao,
      lancamentos.filter((lancamento) => lancamento.fonteDestinoId === cartao.id),
      meses,
      hoje,
    )),
  };
}
