// Previsão de faturas dos cartões (RF9): fatura aberta + próximas, com parcelas futuras.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequisicao } from '../../hooks/useRequisicao.js';
import { relatoriosApi } from '../../services/api.js';
import { Campo } from '../ui/Campo.jsx';
import { ConteudoRequisicao } from '../ui/Estados.jsx';
import { IconeCartao } from '../ui/Icones.jsx';
import { capitalizar, data, mesAno, moeda, percentual } from '../../utils/formatadores.js';

const ROTULO_STATUS = {
  fechada: { texto: 'Fechada', classe: 'chip--alerta' },
  aberta: { texto: 'Aberta', classe: 'chip--destaque' },
  futura: { texto: 'Prevista', classe: '' },
};

function Fatura({ fatura }) {
  const status = ROTULO_STATUS[fatura.status];
  return (
    <article className={`fatura ${fatura.status === 'aberta' ? 'fatura--aberta' : ''}`}>
      <div className="fatura__topo">
        <span className="fatura__mes">{capitalizar(mesAno(fatura.referencia))}</span>
        <span className={`chip ${status.classe}`}>{status.texto}</span>
      </div>
      <div className="fatura__total">{moeda(fatura.total)}</div>
      <div className="fatura__datas">
        <span>Fecha {data(fatura.fechamento)}</span>
        <span>Vence {data(fatura.vencimento)}</span>
      </div>
      {fatura.lancamentos.length === 0 ? (
        <p className="texto-fraco">Nenhum lançamento nesta fatura.</p>
      ) : (
        <ul className="fatura__itens">
          {fatura.lancamentos.map((l) => (
            <li key={l.id} title={`${l.categoria} · compra em ${data(l.dataCompra)}`}>
              <span>
                {l.descricao}
                {l.parcela && <> — <strong>{l.parcela}</strong></>}
              </span>
              <span className={l.tipo === 'entrada' ? 'texto-entrada' : ''}>
                {l.tipo === 'entrada' ? '−' : ''}{moeda(l.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function CartaoComFaturas({ cartao }) {
  const nivel = cartao.percentualUtilizado >= 90 ? 'barra--perigo' : cartao.percentualUtilizado >= 70 ? 'barra--alerta' : '';
  return (
    <section className="card">
      <div className="card__cabecalho" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="cartao-fonte__icone"><IconeCartao /></span>
          <div>
            <h2>{cartao.nome}</h2>
            <p>Fecha dia {cartao.diaFechamento} · vence dia {cartao.diaVencimento}</p>
          </div>
        </div>
        <div className="limite">
          <div className="limite__numeros">
            <span>Utilizado <strong>{moeda(cartao.limiteUtilizado)}</strong></span>
            <span>Disponível <strong className={cartao.limiteDisponivel < 0 ? 'texto-saida' : 'texto-entrada'}>{moeda(cartao.limiteDisponivel)}</strong></span>
          </div>
          <div className={`barra ${nivel}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={cartao.percentualUtilizado} aria-label="Limite utilizado">
            <div className="barra__preenchimento" style={{ width: `${Math.min(100, cartao.percentualUtilizado)}%` }} />
          </div>
          <span className="texto-fraco">
            {percentual(cartao.percentualUtilizado)} de {moeda(cartao.limite)} · inclui todas as parcelas ainda não vencidas
          </span>
        </div>
      </div>
      <div className="faturas-trilho">
        {cartao.faturas.map((fatura) => <Fatura key={fatura.referencia} fatura={fatura} />)}
      </div>
    </section>
  );
}

export default function Faturas() {
  const [meses, setMeses] = useState(3);
  const { dados, carregando, erro, recarregar } = useRequisicao(() => relatoriosApi.faturas(meses), [meses]);

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Faturas</h1>
          <p>Fatura aberta e previsão das próximas, considerando as parcelas futuras.</p>
        </div>
        <div style={{ width: 200 }}>
          <Campo id="meses" como="select" rotulo="Próximas faturas" value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </Campo>
        </div>
      </header>

      <ConteudoRequisicao
        carregando={carregando && !dados}
        erro={erro}
        recarregar={recarregar}
        vazio={dados?.cartoes.length === 0}
        vazioProps={{
          titulo: 'Nenhum cartão de crédito cadastrado',
          children: 'Cadastre um cartão (com dia de fechamento, vencimento e limite) para ver as faturas.',
          acao: <Link to="/fontes-destinos" className="botao botao--primario botao--pequeno">Cadastrar cartão</Link>,
        }}
      >
        {dados?.cartoes.map((cartao) => <CartaoComFaturas key={cartao.id} cartao={cartao} />)}
      </ConteudoRequisicao>
    </>
  );
}
