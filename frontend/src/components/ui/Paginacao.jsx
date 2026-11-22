import { IconeAnterior, IconeProximo } from './Icones.jsx';

export default function Paginacao({ pagina, totalPaginas, totalItens, aoMudar }) {
  if (totalItens === 0) return null;
  return (
    <nav className="paginacao" aria-label="Paginação">
      <span className="texto-fraco">
        Página {pagina} de {totalPaginas} · {totalItens} {totalItens === 1 ? 'lançamento' : 'lançamentos'}
      </span>
      <div className="paginacao__botoes">
        <button type="button" className="botao botao--secundario botao--pequeno" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
          <IconeAnterior tamanho={16} /> Anterior
        </button>
        <button type="button" className="botao botao--secundario botao--pequeno" disabled={pagina >= totalPaginas} onClick={() => aoMudar(pagina + 1)}>
          Próxima <IconeProximo tamanho={16} />
        </button>
      </div>
    </nav>
  );
}
