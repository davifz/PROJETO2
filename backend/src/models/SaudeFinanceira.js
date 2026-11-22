import { query } from '../config/db.js';
import { calcularFatura } from './regras/faturas.js';
import { hojeISO, adicionarMeses, mesDe } from './regras/datas.js';
import { emCentavos, deCentavos, arredondar2 } from './regras/dinheiro.js';

export const LIMITES = {
  taxaPoupancaMeta: 10,              // % da renda guardada no mês considerado bom
  cartoesAtencao: 30,                // % da renda comprometida com faturas
  cartoesCritico: 50,                
  regra503020: { necessidades: 50, desejos: 30, poupanca: 20 },
  foraDaCurvaPercentual: 30,         // gasto do mês X% acima da média
  foraDaCurvaMinimoCentavos: 5000,   // ...e pelo menos R$ 50,00 acima
  reservaMesesBom: 3,                // reserva cobre 3+ meses de despesas → bom
  reservaMesesMinimo: 1,             // menos de 1 mês → crítico
  mesesProjecao: 6,
};

export const AVISO = 'As informações desta página são educativas e não constituem recomendação financeira profissional.';

const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeDoMes = (mes) => `${NOMES_MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
const moeda = (centavos) => deCentavos(centavos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (numero) => `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const percentualDe = (parte, total) => (total > 0 ? arredondar2((parte / total) * 100) : null);

async function buscarDados(usuarioId) {
  const lancamentos = await query(
    `SELECT l.tipo, l.valor, l.data,
            l.parcela_atual AS "parcelaAtual", l.total_parcelas AS "totalParcelas",
            c.id AS "categoriaId", c.nome AS "categoriaNome", c.grupo_orcamento AS "grupoOrcamento",
            f.tipo AS "fonteTipo", f.reserva,
            f.dia_fechamento AS "diaFechamento", f.dia_vencimento AS "diaVencimento"
       FROM lancamentos l
       JOIN categorias c      ON c.id = l.categoria_id
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = $1`,
    [usuarioId],
  );
  const reservas = await query(
    'SELECT COUNT(*) AS quantidade FROM fontes_destinos WHERE usuario_id = $1 AND reserva = TRUE',
    [usuarioId],
  );
  return { linhas: lancamentos.rows, quantidadeReservas: reservas.rows[0].quantidade };
}

export async function analisar(usuarioId, hoje = hojeISO()) {
  const { linhas, quantidadeReservas } = await buscarDados(usuarioId);

  const itens = linhas.map((linha) => {
    const dataCaixa = linha.fonteTipo === 'cartao_credito'
      ? calcularFatura(linha.data, linha, linha.parcelaAtual).vencimento
      : linha.data;
    return {
      ...linha,
      centavos: emCentavos(linha.valor),
      sinal: linha.tipo === 'entrada' ? 1 : -1,
      mes: mesDe(linha.data),
      dataCaixa,
      mesCaixa: mesDe(dataCaixa),
    };
  });

  const somar = (filtro) => itens.filter(filtro).reduce((soma, item) => soma + item.centavos, 0);
  const somarComSinal = (filtro) => itens.filter(filtro).reduce((soma, item) => soma + item.sinal * item.centavos, 0);

  const mesAtual = mesDe(hoje);
  const mesesBase = [3, 2, 1].map((k) => mesDe(adicionarMeses(hoje, -k)));   // 3 meses completos anteriores
  const mesesComDados = mesesBase.filter((mes) => itens.some((item) => item.mes === mes));
  const divisor = Math.max(1, mesesComDados.length);
  const semHistorico = mesesComDados.length === 0;

  const mediaEntradas = Math.round(somar((i) => i.tipo === 'entrada' && mesesBase.includes(i.mes)) / divisor);
  const mediaSaidas = Math.round(somar((i) => i.tipo === 'saida' && mesesBase.includes(i.mes)) / divisor);

  const indicadores = [];

  {
    const mesRef = mesesBase[2];
    const entradas = somar((i) => i.tipo === 'entrada' && i.mes === mesRef);
    const saidas = somar((i) => i.tipo === 'saida' && i.mes === mesRef);
    const taxa = percentualDe(entradas - saidas, entradas);
    let status = 'neutro';
    let dica = `Não há entradas registradas em ${nomeDoMes(mesRef)}.`;
    if (taxa !== null) {
      status = taxa >= LIMITES.taxaPoupancaMeta ? 'bom' : taxa >= 0 ? 'atencao' : 'critico';
      dica = taxa >= 0
        ? `Você guardou ${pct(taxa)} da sua renda em ${nomeDoMes(mesRef)}. ${taxa >= LIMITES.taxaPoupancaMeta
          ? 'Ótimo: acima da meta comum de 10%.' : 'Uma meta comum é guardar pelo menos 10%.'}`
        : `Em ${nomeDoMes(mesRef)} você gastou ${pct(-taxa)} a mais do que recebeu. Revise os gastos para voltar a poupar.`;
    }
    indicadores.push({
      id: 'taxa-poupanca',
      titulo: 'Taxa de poupança',
      descricao: `(entradas − saídas) ÷ entradas em ${nomeDoMes(mesRef)}`,
      valor: taxa,
      formato: 'percentual',
      status,
      dica,
      historico: mesesBase.map((mes) => {
        const e = somar((i) => i.tipo === 'entrada' && i.mes === mes);
        const s = somar((i) => i.tipo === 'saida' && i.mes === mes);
        return { mes, entradas: deCentavos(e), saidas: deCentavos(s), taxa: percentualDe(e - s, e) };
      }),
    });
  }

  {
    const ate = adicionarMeses(hoje, 3);
    const faturas = Math.max(0, -somarComSinal(
      (i) => i.fonteTipo === 'cartao_credito' && i.dataCaixa >= hoje && i.dataCaixa <= ate,
    ));
    const renda = mediaEntradas * 3;
    const valor = faturas === 0 ? 0 : percentualDe(faturas, renda);
    let status = 'bom';
    let dica = 'Você não tem faturas de cartão a vencer nos próximos 3 meses.';
    if (faturas > 0 && valor === null) {
      status = 'atencao';
      dica = `Suas faturas dos próximos 3 meses somam ${moeda(faturas)}, mas não há renda registrada para comparar.`;
    } else if (faturas > 0) {
      status = valor > LIMITES.cartoesCritico ? 'critico' : valor > LIMITES.cartoesAtencao ? 'atencao' : 'bom';
      dica = `Suas faturas dos próximos 3 meses somam ${moeda(faturas)} e comprometem ${pct(valor)} da sua renda.`
        + (valor > LIMITES.cartoesAtencao ? ' Tente manter abaixo de 30%.' : '');
    }
    indicadores.push({
      id: 'comprometimento-cartoes',
      titulo: 'Comprometimento com cartões',
      descricao: 'Faturas dos próximos 3 meses ÷ renda média de 3 meses',
      valor,
      formato: 'percentual',
      status,
      dica,
    });
  }

  const parcelasPorMes = new Map();
  for (const item of itens) {
    if (item.totalParcelas > 1 && item.tipo === 'saida' && item.dataCaixa > hoje) {
      parcelasPorMes.set(item.mesCaixa, (parcelasPorMes.get(item.mesCaixa) ?? 0) + item.centavos);
    }
  }
  const parcelasFuturas = [...parcelasPorMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, centavos]) => ({ mes, total: deCentavos(centavos) }));
  {
    const total = [...parcelasPorMes.values()].reduce((soma, valor) => soma + valor, 0);
    const ultimo = parcelasFuturas.at(-1);
    indicadores.push({
      id: 'parcelas-futuras',
      titulo: 'Parcelas futuras',
      descricao: 'Soma das parcelas de compras parceladas ainda a vencer',
      valor: deCentavos(total),
      formato: 'moeda',
      status: total === 0 ? 'bom' : total > mediaEntradas * 3 && mediaEntradas > 0 ? 'atencao' : 'neutro',
      dica: total > 0
        ? `Você tem ${moeda(total)} em parcelas a vencer até ${nomeDoMes(ultimo.mes)}.`
        : 'Você não tem compras parceladas a vencer.',
    });
  }

  const base = itens.filter((i) => mesesBase.includes(i.mes));
  const renda = base.filter((i) => i.tipo === 'entrada').reduce((s, i) => s + i.centavos, 0);
  const saidasDoGrupo = (grupo) => base
    .filter((i) => i.tipo === 'saida' && (i.grupoOrcamento ?? 'desejo') === grupo)
    .reduce((s, i) => s + i.centavos, 0);
  const necessidades = saidasDoGrupo('necessidade');
  const desejos = saidasDoGrupo('desejo');               // sem classificação conta como desejo
  const poupanca = renda - necessidades - desejos;       // investimentos + o que sobrou
  const regra503020 = {
    meses: mesesBase,
    renda: deCentavos(renda),
    necessidades: { valor: deCentavos(necessidades), percentual: percentualDe(necessidades, renda), referencia: 50 },
    desejos: { valor: deCentavos(desejos), percentual: percentualDe(desejos, renda), referencia: 30 },
    poupanca: { valor: deCentavos(poupanca), percentual: percentualDe(poupanca, renda), referencia: 20 },
  };
  {
    let status = 'neutro';
    let dica = 'Registre suas entradas para comparar seus gastos com a regra 50/30/20.';
    if (renda > 0) {
      const { necessidades: n, desejos: d, poupanca: p } = regra503020;
      const ref = LIMITES.regra503020;
      if (d.percentual > ref.desejos) {
        dica = `Os gastos com desejos estão em ${pct(d.percentual)} da renda (referência: 30%).`;
      } else if (n.percentual > ref.necessidades) {
        dica = `Os gastos com necessidades estão em ${pct(n.percentual)} da renda (referência: 50%).`;
      } else if (p.percentual < ref.poupanca) {
        dica = `Você está poupando ${pct(p.percentual)} da renda (referência: 20%).`;
      } else {
        dica = 'Seus gastos estão dentro da regra 50/30/20. Continue assim!';
      }
      status = p.percentual < 0 ? 'critico'
        : (d.percentual <= ref.desejos && n.percentual <= ref.necessidades && p.percentual >= ref.poupanca) ? 'bom'
          : 'atencao';
    }
    indicadores.push({
      id: 'regra-50-30-20',
      titulo: 'Regra 50/30/20',
      descricao: 'Necessidades, desejos e poupança como % da renda (últimos 3 meses)',
      valor: regra503020.poupanca.percentual,
      formato: 'percentual',
      rotuloValor: 'poupado',
      status,
      dica,
    });
  }

  const caixa = (mes, tipo, filtro = () => true) => somar((i) => i.mesCaixa === mes && i.tipo === tipo && filtro(i));
  const aVista = (i) => i.totalParcelas === 1;
  const parcelado = (i) => i.totalParcelas > 1;
  const mediaEntradasCaixa = Math.round(mesesBase.reduce((s, mes) => s + caixa(mes, 'entrada'), 0) / divisor);
  const mediaSaidasAVista = Math.round(mesesBase.reduce((s, mes) => s + caixa(mes, 'saida', aVista), 0) / divisor);
  const saldoAtual = somarComSinal((i) => i.mesCaixa <= mesAtual);

  let saldo = saldoAtual;
  const mesesProjetados = [];
  for (let k = 1; k <= LIMITES.mesesProjecao; k++) {
    const mes = mesDe(adicionarMeses(hoje, k));
    const entradas = Math.max(mediaEntradasCaixa, caixa(mes, 'entrada'));
    const parcelas = caixa(mes, 'saida', parcelado);
    const saidas = Math.max(mediaSaidasAVista, caixa(mes, 'saida', aVista)) + parcelas;
    saldo += entradas - saidas;
    mesesProjetados.push({
      mes,
      entradas: deCentavos(entradas),
      saidas: deCentavos(saidas),
      parcelas: deCentavos(parcelas),
      resultado: deCentavos(entradas - saidas),
      saldo: deCentavos(saldo),
    });
  }
  const projecao = {
    saldoAtual: deCentavos(saldoAtual),
    mesAtual,
    mediaEntradas: deCentavos(mediaEntradasCaixa),
    mediaSaidasAVista: deCentavos(mediaSaidasAVista),
    meses: mesesProjetados,
  };
  {
    const primeiroNegativo = mesesProjetados.find((m) => m.saldo < 0);
    const ultimo = mesesProjetados.at(-1);
    let status = ultimo.saldo >= projecao.saldoAtual ? 'bom' : 'atencao';
    let dica = `Mantido o ritmo atual, seu saldo projetado em ${nomeDoMes(ultimo.mes)} é de ${moeda(emCentavos(ultimo.saldo))}.`;
    if (primeiroNegativo) {
      status = 'critico';
      dica = `Atenção: mantido o ritmo atual, seu saldo fica negativo em ${nomeDoMes(primeiroNegativo.mes)}.`;
    }
    if (semHistorico) {
      status = 'neutro';
      dica = 'A projeção fica mais precisa depois de alguns meses de lançamentos.';
    }
    indicadores.push({
      id: 'projecao-saldo',
      titulo: `Saldo projetado (${LIMITES.mesesProjecao} meses)`,
      descricao: 'Média de 3 meses + parcelas já conhecidas',
      valor: ultimo.saldo,
      formato: 'moeda',
      status,
      dica,
    });
  }

  // Categoria fora da curva 
  const atuais = new Map();
  const historicas = new Map();
  for (const item of itens) {
    if (item.tipo !== 'saida') continue;
    const chave = item.categoriaId;
    if (item.mes === mesAtual && item.data <= hoje) {
      atuais.set(chave, { nome: item.categoriaNome, centavos: (atuais.get(chave)?.centavos ?? 0) + item.centavos });
    } else if (mesesBase.includes(item.mes)) {
      historicas.set(chave, (historicas.get(chave) ?? 0) + item.centavos);
    }
  }
  const foraDaCurva = [];
  for (const [categoriaId, { nome, centavos }] of atuais) {
    const media = Math.round((historicas.get(categoriaId) ?? 0) / divisor);
    if (media <= 0) continue;
    const acima = percentualDe(centavos - media, media);
    if (acima > LIMITES.foraDaCurvaPercentual && centavos - media >= LIMITES.foraDaCurvaMinimoCentavos) {
      foraDaCurva.push({ categoriaId, categoria: nome, atual: deCentavos(centavos), media: deCentavos(media), percentualAcima: acima });
    }
  }
  foraDaCurva.sort((a, b) => b.percentualAcima - a.percentualAcima);
  indicadores.push({
    id: 'fora-da-curva',
    titulo: 'Categoria fora da curva',
    descricao: `Gasto de ${nomeDoMes(mesAtual)} comparado à média dos 3 meses anteriores`,
    valor: foraDaCurva[0]?.percentualAcima ?? 0,
    formato: 'percentual',
    rotuloValor: foraDaCurva[0] ? `acima em ${foraDaCurva[0].categoria}` : 'nenhuma acima',
    status: semHistorico ? 'neutro' : foraDaCurva.length > 0 ? 'atencao' : 'bom',
    dica: foraDaCurva.length > 0
      ? `Seus gastos com ${foraDaCurva[0].categoria} estão ${pct(foraDaCurva[0].percentualAcima)} acima da sua média.`
      : `Nenhuma categoria está fora da curva em ${nomeDoMes(mesAtual)}.`,
  });

  {
    const saldoReserva = somarComSinal((i) => i.reserva && i.data <= hoje);
    const meses = mediaSaidas > 0 ? arredondar2(saldoReserva / mediaSaidas) : null;
    let status = 'neutro';
    let dica = 'Marque uma conta como reserva de emergência em Fontes/Destinos para acompanhar este indicador.';
    if (quantidadeReservas > 0 && meses !== null) {
      status = meses >= LIMITES.reservaMesesBom ? 'bom' : meses >= LIMITES.reservaMesesMinimo ? 'atencao' : 'critico';
      const texto = meses.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      dica = `Sua reserva cobre ${texto} ${meses === 1 ? 'mês' : 'meses'} de despesas. Uma referência comum é de 3 a 6 meses.`;
    } else if (quantidadeReservas > 0) {
      dica = `Sua reserva soma ${moeda(saldoReserva)}. Registre suas despesas para calcular quantos meses ela cobre.`;
    }
    indicadores.push({
      id: 'reserva-emergencia',
      titulo: 'Reserva de emergência',
      descricao: 'Saldo das contas de reserva ÷ média de saídas mensais',
      valor: quantidadeReservas > 0 ? meses : null,
      formato: 'meses',
      status,
      dica,
    });
  }

  return {
    aviso: AVISO,
    hoje,
    mesesBase,
    semHistorico,
    indicadores,
    projecao,
    parcelasFuturas,
    regra503020,
    foraDaCurva,
    limites: LIMITES,
  };
}
