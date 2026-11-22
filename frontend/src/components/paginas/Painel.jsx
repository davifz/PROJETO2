// Dashboard: resumo do mês, gastos por categoria, cartões e últimos lançamentos.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRequisicao } from '../../hooks/useRequisicao.js';
import { categoriasApi, lancamentosApi, relatoriosApi } from '../../services/api.js';
import ResumoTotais from '../ui/ResumoTotais.jsx';
import SeletorPeriodo from '../ui/SeletorPeriodo.jsx';
import RoscaCategorias from '../ui/RoscaCategorias.jsx';
import { ConteudoRequisicao } from '../ui/Estados.jsx';
import { IconeSetaBaixo, IconeSetaCima } from '../ui/Icones.jsx';
import { criarMapaDeCores } from '../../utils/cores.js';
import { mesCorrente } from '../../utils/datas.js';
import { data, dataCurta, mesAno, mesAnoCurto, moeda, percentual } from '../../utils/formatadores.js';

function CartoesResumo({ cartoes }) {
  return (
    <ul className="lista-simples">
      {cartoes.map((cartao) => {
        const aberta = cartao.faturas.find((f) => f.status === 'aberta');
        const fechada = cartao.faturas.find((f) => f.status === 'fechada');
        const nivel = cartao.percentualUtilizado >= 90 ? 'barra--perigo' : cartao.percentualUtilizado >= 70 ? 'barra--alerta' : '';
        return (
          <li key={cartao.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div className="lista-simples__principal">
                <strong>{cartao.nome}</strong>
                <span className="texto-fraco">
                  Fatura de {mesAnoCurto(aberta.referencia)} (aberta) · vence {dataCurta(aberta.vencimento)}
                </span>
                {fechada && (
                  <span className="texto-fraco">
                    Fechada: {moeda(fechada.total)} · vence {dataCurta(fechada.vencimento)}
                  </span>
                )}
              </div>
              <span className="lista-simples__valor">{moeda(aberta.total)}</span>
            </div>
            <div className={`barra ${nivel}`} title={`${percentual(cartao.percentualUtilizado)} do limite utilizado`}>
              <div className="barra__preenchimento" style={{ width: `${Math.min(100, cartao.percentualUtilizado)}%` }} />
            </div>
            <span className="texto-fraco">
              Limite disponível: {moeda(cartao.limiteDisponivel)} de {moeda(cartao.limite)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Painel() {
  const { usuario } = useAuth();
  const [periodo, setPeriodo] = useState(mesCorrente);

  const lancamentos = useRequisicao(() => lancamentosApi.listar({ ...periodo, porPagina: 6 }), [periodo.inicio, periodo.fim]);
  const relatorio = useRequisicao(() => relatoriosApi.porCategoria(periodo), [periodo.inicio, periodo.fim]);
  const categorias = useRequisicao(() => categoriasApi.listar('saida'), []);
  const faturas = useRequisicao(() => relatoriosApi.faturas(1), []);

  const cores = useMemo(() => criarMapaDeCores(categorias.dados ?? []), [categorias.dados]);
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? '';

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Olá, {primeiroNome}</h1>
          <p>Resumo de {mesAno(periodo.inicio.slice(0, 7))}</p>
        </div>
        <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} permitirPersonalizado={false} />
      </header>

      {lancamentos.erro
        ? <ConteudoRequisicao erro={lancamentos.erro} recarregar={lancamentos.recarregar} />
        : <ResumoTotais totais={lancamentos.dados?.totais} />}

      <div className="grade grade--dashboard">
        <section className="card">
          <div className="card__cabecalho">
            <div>
              <h2>Gastos por categoria</h2>
              <p>Saídas do mês</p>
            </div>
            <Link to="/relatorios">Ver relatório</Link>
          </div>
          <ConteudoRequisicao
            carregando={relatorio.carregando || categorias.carregando}
            erro={relatorio.erro || categorias.erro}
            recarregar={() => { relatorio.recarregar(); categorias.recarregar(); }}
            vazio={relatorio.dados?.totalSaidas === 0}
            vazioProps={{ titulo: 'Nenhuma saída neste mês', children: 'Registre um lançamento para ver seus gastos por categoria.' }}
          >
            {relatorio.dados && (
              <RoscaCategorias itens={relatorio.dados.categorias} total={relatorio.dados.totalSaidas} cores={cores} />
            )}
          </ConteudoRequisicao>
        </section>

        <section className="card">
          <div className="card__cabecalho">
            <div>
              <h2>Cartões de crédito</h2>
              <p>Fatura aberta e limite</p>
            </div>
            <Link to="/faturas">Ver faturas</Link>
          </div>
          <ConteudoRequisicao
            carregando={faturas.carregando}
            erro={faturas.erro}
            recarregar={faturas.recarregar}
            vazio={faturas.dados?.cartoes.length === 0}
            vazioProps={{
              titulo: 'Nenhum cartão cadastrado',
              children: 'Cadastre um cartão de crédito em Fontes e destinos para acompanhar as faturas.',
            }}
            compacto
          >
            {faturas.dados && <CartoesResumo cartoes={faturas.dados.cartoes} />}
          </ConteudoRequisicao>
        </section>
      </div>

      <section className="card">
        <div className="card__cabecalho">
          <div>
            <h2>Últimos lançamentos</h2>
            <p>Os mais recentes do mês</p>
          </div>
          <Link to="/lancamentos">Ver todos</Link>
        </div>
        <ConteudoRequisicao
          carregando={lancamentos.carregando}
          erro={lancamentos.erro}
          recarregar={lancamentos.recarregar}
          vazio={lancamentos.dados?.itens.length === 0}
          vazioProps={{
            titulo: 'Nenhum lançamento neste mês',
            acao: <Link to="/lancamentos" className="botao botao--primario botao--pequeno">Novo lançamento</Link>,
          }}
          compacto
        >
          <ul className="lista-simples">
            {lancamentos.dados?.itens.map((l) => (
              <li key={l.id}>
                <span className={`icone-tipo icone-tipo--${l.tipo}`}>
                  {l.tipo === 'entrada' ? <IconeSetaCima /> : <IconeSetaBaixo />}
                </span>
                <div className="lista-simples__principal">
                  <strong>
                    {l.descricao}{' '}
                    {l.totalParcelas > 1 && <span className="chip">{l.parcelaAtual}/{l.totalParcelas}</span>}
                  </strong>
                  <span className="texto-fraco">{l.categoriaNome} · {l.fonteDestinoNome} · {data(l.data)}</span>
                </div>
                <span className={`lista-simples__valor ${l.tipo === 'entrada' ? 'texto-entrada' : 'texto-saida'}`}>
                  {l.tipo === 'entrada' ? '+' : '−'} {moeda(l.valor)}
                </span>
              </li>
            ))}
          </ul>
        </ConteudoRequisicao>
      </section>
    </>
  );
}
