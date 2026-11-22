import { moeda } from '../../utils/formatadores.js';
import { COR_EIXO } from '../../utils/cores.js';

export const propsEixo = {
  tick: { fill: COR_EIXO, fontSize: 12 },
  axisLine: false,
  tickLine: false,
};

export function DicaGrafico({ active, payload, label, formatarRotulo = (r) => r, formatarValor = moeda }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dica-grafico">
      {label !== undefined && label !== null && label !== '' && <div className="dica-grafico__titulo">{formatarRotulo(label)}</div>}
      {payload.map((item) => (
        <div className="dica-grafico__linha" key={item.dataKey ?? item.name}>
          <span>
            <i className="amostra" style={{ background: item.color ?? item.payload?.cor }} />
            {item.name}
          </span>
          <strong className="numero">{formatarValor(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// Variação percentual com seta. Para gastos, aumento é "ruim" (vermelho).
export function Variacao({ variacao, tendencia, aumentoEhBom = false }) {
  if (tendencia === 'estavel') return <span className="variacao variacao--neutra">= sem mudança</span>;
  if (variacao === null || variacao === undefined) {
    return <span className="variacao variacao--neutra">{tendencia === 'aumento' ? 'novo no período' : '—'}</span>;
  }
  const subiu = tendencia === 'aumento';
  const boa = subiu === aumentoEhBom;
  const texto = `${subiu ? '▲ +' : '▼ '}${variacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return (
    <span className={`variacao ${boa ? 'variacao--boa' : 'variacao--ruim'}`}>
      {texto}
      <span className="visualmente-oculto">{subiu ? 'aumento' : 'redução'}</span>
    </span>
  );
}
