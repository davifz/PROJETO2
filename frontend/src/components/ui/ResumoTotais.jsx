// Cartões com total de entradas, total de saídas e saldo do período.
import { IconeSaldo, IconeSetaBaixo, IconeSetaCima } from './Icones.jsx';
import { moeda } from '../../utils/formatadores.js';

export default function ResumoTotais({ totais, rodape }) {
  const { entradas = 0, saidas = 0, saldo = 0 } = totais ?? {};
  return (
    <div className="grade grade--3">
      <article className="card resumo resumo--entrada">
        <span className="rotulo">Entradas</span>
        <div className="resumo__valor texto-entrada">{moeda(entradas)}</div>
        {rodape && <div className="resumo__rodape">{rodape}</div>}
        <span className="resumo__icone"><IconeSetaCima /></span>
      </article>
      <article className="card resumo resumo--saida">
        <span className="rotulo">Saídas</span>
        <div className="resumo__valor texto-saida">{moeda(saidas)}</div>
        {rodape && <div className="resumo__rodape">{rodape}</div>}
        <span className="resumo__icone"><IconeSetaBaixo /></span>
      </article>
      <article className="card resumo resumo--saldo">
        <span className="rotulo">Saldo (entradas − saídas)</span>
        <div className={`resumo__valor ${saldo < 0 ? 'texto-saida' : ''}`}>{moeda(saldo)}</div>
        {rodape && <div className="resumo__rodape">{rodape}</div>}
        <span className="resumo__icone"><IconeSaldo /></span>
      </article>
    </div>
  );
}
