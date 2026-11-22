import { centavosParaTexto } from '../../utils/formatadores.js';

export function Campo({ id, rotulo, erro, ajuda, como: Elemento = 'input', prefixo, children, ...props }) {
  const idDescricao = erro || ajuda ? `${id}-descricao` : undefined;
  return (
    <div className={`campo ${erro ? 'campo--erro' : ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      <div className={`campo__controle ${prefixo ? 'campo__controle--prefixo' : ''}`}>
        {prefixo && <span className="campo__prefixo">{prefixo}</span>}
        <Elemento id={id} aria-invalid={Boolean(erro)} aria-describedby={idDescricao} {...props}>
          {children}
        </Elemento>
      </div>
      {erro
        ? <span className="campo__erro" id={idDescricao}>{erro}</span>
        : ajuda && <span className="campo__ajuda" id={idDescricao}>{ajuda}</span>}
    </div>
  );
}

export function CampoMoeda({ id, rotulo, centavos, aoMudar, erro, ajuda, ...props }) {
  return (
    <Campo
      id={id}
      rotulo={rotulo}
      erro={erro}
      ajuda={ajuda}
      prefixo="R$"
      inputMode="numeric"
      autoComplete="off"
      placeholder="0,00"
      value={centavos ? centavosParaTexto(centavos) : ''}
      onChange={(evento) => {
        const digitos = evento.target.value.replace(/\D/g, '').slice(0, 11);
        aoMudar(digitos ? Number(digitos) : 0);
      }}
      {...props}
    />
  );
}
