import { useEffect, useRef } from 'react';
import { IconeFechar } from './Icones.jsx';

export default function Modal({ titulo, aberto, aoFechar, children, largura = 520 }) {
  const caixaRef = useRef(null);
  const aoFecharRef = useRef(aoFechar);
  aoFecharRef.current = aoFechar;

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFecharRef.current();
    };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';

    const primeiro = caixaRef.current?.querySelector('input, select, textarea, button:not(.botao-icone)');
    primeiro?.focus();
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        style={{ maxWidth: largura }}
        ref={caixaRef}
      >
        <header className="modal__cabecalho">
          <h2 id="modal-titulo">{titulo}</h2>
          <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </header>
        <div className="modal__corpo">{children}</div>
      </div>
    </div>
  );
}
