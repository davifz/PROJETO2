export const PALETA_SERIES = [
  '#13A88F',
  '#D95926',
  '#9085E9',
  '#C98500',
  '#3987E5',
  '#D55181',
  '#0CA30C',
  '#E66767',
];

export const COR_OUTROS = '#708A99';
export const COR_ENTRADA = '#13A88F';
export const COR_SAIDA = '#E66767';
export const COR_ANTERIOR = '#708A99';
export const COR_DESTAQUE = '#00F5D4';
export const COR_EIXO = '#9DB2BD';
export const COR_GRADE = 'rgba(112, 138, 153, 0.16)';

export function criarMapaDeCores(itens) {
  const mapa = new Map();
  let posicao = 0;
  [...itens].sort((a, b) => a.id - b.id).forEach((item) => {
    if (item.nome?.toLowerCase() === 'outros' || posicao >= PALETA_SERIES.length) {
      mapa.set(item.id, COR_OUTROS);
    } else {
      mapa.set(item.id, PALETA_SERIES[posicao]);
      posicao += 1;
    }
  });
  return mapa;
}
