import { ultimoDiaDoMes, dataSegura, paraISO } from './datas.js';

// dataCompra: 'AAAA-MM-DD'; cartao: { diaFechamento, diaVencimento }
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
