export const VALOR_MAXIMO_CENTAVOS = 10_000_000_000; 

export function paraCentavos(valor) {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    const centavos = Math.round(valor * 100);
    if (Math.abs(valor * 100 - centavos) > 1e-6) return null;
    return centavos;
  }
  if (typeof valor === 'string') {
    const texto = valor.trim();
    const comMilhar = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(texto);
    const normal = comMilhar ? texto.replace(/\./g, '').replace(',', '.') : texto.replace(',', '.');
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(normal)) return null;
    const [inteiro, fracao = ''] = normal.split('.');
    return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0'));
  }
  return null;
}

// 3334 → '33.34' (texto exato para gravar em NUMERIC, sem passar por float).
export function centavosParaDecimal(centavos) {
  const sinal = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${sinal}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

export const deCentavos = (centavos) => centavos / 100;
export const emCentavos = (numero) => Math.round(Number(numero) * 100);

// R$ 100,00 em 3× → [3334, 3333, 3333]
export function dividirEmParcelas(totalCentavos, quantidade) {
  const base = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => (i === 0 ? base + resto : base));
}

export const arredondar2 = (numero) => Math.round(numero * 100) / 100;
