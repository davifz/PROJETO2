// Regra de fechamento de faturas de cartão de crédito (RF9).
//
// - Compra ANTES do dia de fechamento → fatura que fecha no mesmo mês.
// - Compra NO dia do fechamento ou depois → fatura do mês seguinte.
// - A parcela k cai k − 1 meses depois da fatura da 1ª parcela.
// - Vencimento > fechamento → vence no mesmo mês do fechamento; senão, no mês seguinte.
// - Dias inexistentes (31 em fevereiro) viram o último dia do mês.
import { ultimoDiaDoMes, dataSegura, paraISO } from './datas.js';

// dataCompra: 'AAAA-MM-DD'; cartao: { diaFechamento, diaVencimento }
// numeroParcela: 1 = primeira parcela. (0 devolve a fatura anterior à da compra.)
export function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));

  let mesFechamento = dia < fechamentoDoMes ? m : m + 1;   // antes do fechamento: fatura deste mês
  mesFechamento += numeroParcela - 1;                       // parcelas seguintes: meses seguintes

  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);
  const mesVencimento = cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  return {
    referencia: paraISO(vencimento).slice(0, 7),   // 'AAAA-MM' do vencimento
    fechamento: paraISO(fechamento),
    vencimento: paraISO(vencimento),
  };
}
