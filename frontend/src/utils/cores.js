// Cores dos gráficos. Derivadas da paleta do projeto e validadas para fundo
// escuro (contraste ≥ 3:1 com a superfície dos cards e boa separação para
// daltonismo entre cores vizinhas). A ordem é fixa: nunca reordene.
export const PALETA_SERIES = [
  '#13A88F', // teal (variação do Neon Teal para gráficos)
  '#D95926', // laranja
  '#9085E9', // violeta
  '#C98500', // âmbar
  '#3987E5', // azul
  '#D55181', // magenta
  '#0CA30C', // verde
  '#E66767', // vermelho
];

export const COR_OUTROS = '#708A99';        // Slate Gray — "Outros"/excedente
export const COR_ENTRADA = '#13A88F';
export const COR_SAIDA = '#E66767';
export const COR_ANTERIOR = '#708A99';
export const COR_DESTAQUE = '#00F5D4';      // Neon Teal
export const COR_EIXO = '#9DB2BD';
export const COR_GRADE = 'rgba(112, 138, 153, 0.16)';

// A cor acompanha a categoria (não a posição no ranking): cada categoria recebe
// uma cor fixa pela ordem do id. "Outros" e o excedente usam o cinza.
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
