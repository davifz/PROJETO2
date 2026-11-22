// Gráfico de rosca das saídas por categoria + legenda com valores.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DicaGrafico } from './Graficos.jsx';
import { COR_OUTROS } from '../../utils/cores.js';
import { moeda, moedaCompacta, percentual } from '../../utils/formatadores.js';

export default function RoscaCategorias({ itens, cores, total, limite = 6 }) {
  const comValor = itens.filter((item) => item.total > 0);
  const principais = comValor.slice(0, limite).map((item) => ({ ...item, cor: cores.get(item.id) ?? COR_OUTROS }));
  const resto = comValor.slice(limite);
  if (resto.length > 0) {
    const totalResto = resto.reduce((soma, item) => soma + Math.round(item.total * 100), 0) / 100;
    principais.push({
      id: 'demais',
      nome: `Demais (${resto.length})`,
      total: totalResto,
      percentual: total > 0 ? Math.round((totalResto / total) * 10000) / 100 : 0,
      cor: COR_OUTROS,
    });
  }

  return (
    <div className="rosca">
      <div className="rosca__grafico">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={principais}
              dataKey="total"
              nameKey="nome"
              innerRadius="64%"
              outerRadius="96%"
              paddingAngle={1.5}
              stroke="#152a36"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {principais.map((item) => <Cell key={item.id} fill={item.cor} />)}
            </Pie>
            <Tooltip content={<DicaGrafico />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="rosca__centro">
          <div>
            <span className="rotulo">Total</span>
            <strong>{moedaCompacta(total)}</strong>
          </div>
        </div>
      </div>
      <ul className="legenda">
        {principais.map((item) => (
          <li key={item.id}>
            <span className="amostra" style={{ background: item.cor }} />
            <span>{item.nome}</span>
            <span className="texto-fraco">{percentual(item.percentual)}</span>
            <strong>{moeda(item.total)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
