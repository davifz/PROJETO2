// Formatação de valores para exibição (padrão brasileiro).

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatadorMoedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
});

export const moeda = (valor) => formatadorMoeda.format(Number(valor) || 0);
export const moedaCompacta = (valor) => formatadorMoedaCompacta.format(Number(valor) || 0);

// 'AAAA-MM-DD' → 'DD/MM/AAAA' (sem passar por Date, para não sofrer com fuso horário)
export function data(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');

export function percentual(valor, casas = 1) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// 'AAAA-MM' → 'novembro de 2026'
export const mesAno = (referencia) => `${MESES[Number(referencia.slice(5, 7)) - 1]} de ${referencia.slice(0, 4)}`;
// 'AAAA-MM' → 'nov/26'
export const mesAnoCurto = (referencia) => `${MESES_CURTOS[Number(referencia.slice(5, 7)) - 1]}/${referencia.slice(2, 4)}`;

export const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Máscara de CPF: 52998224725 → 529.982.247-25
export function mascaraCpf(valor) {
  const digitos = String(valor).replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// 123456 (centavos) → '1.234,56'
export const centavosParaTexto = (centavos) => (centavos / 100)
  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ROTULO_TIPO = { entrada: 'Entrada', saida: 'Saída' };
export const ROTULO_TIPO_FONTE = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };
export const ROTULO_GRUPO = { necessidade: 'Necessidade', desejo: 'Desejo', poupanca: 'Poupança' };
