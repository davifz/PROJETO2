// Estados padrão das telas que consomem a API: carregando, vazio e erro.
import { IconeAlerta, IconeVazio } from './Icones.jsx';

export function Carregando({ texto = 'Carregando...', compacto = false }) {
  return (
    <div className={`estado ${compacto ? 'estado--compacto' : ''}`} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function EstadoVazio({ titulo, children, acao, compacto = false }) {
  return (
    <div className={`estado estado--vazio ${compacto ? 'estado--compacto' : ''}`}>
      <IconeVazio />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      {acao}
    </div>
  );
}

export function EstadoErro({ erro, aoTentarNovamente, compacto = false }) {
  return (
    <div className={`estado estado--erro ${compacto ? 'estado--compacto' : ''}`} role="alert">
      <IconeAlerta tamanho={28} />
      <strong>Não foi possível carregar os dados.</strong>
      <p>{erro?.message}</p>
      {aoTentarNovamente && (
        <button type="button" className="botao botao--secundario botao--pequeno" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// Envolve o conteúdo e decide qual estado mostrar.
export function ConteudoRequisicao({ carregando, erro, vazio, recarregar, vazioProps, children, compacto }) {
  if (erro) return <EstadoErro erro={erro} aoTentarNovamente={recarregar} compacto={compacto} />;
  if (carregando) return <Carregando compacto={compacto} />;
  if (vazio) return <EstadoVazio compacto={compacto} {...vazioProps} />;
  return children;
}
