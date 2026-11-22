import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useRequisicao } from '../../hooks/useRequisicao.js';
import { categoriasApi, relatoriosApi } from '../../services/api.js';
import SeletorPeriodo from '../ui/SeletorPeriodo.jsx';
import RoscaCategorias from '../ui/RoscaCategorias.jsx';
import { ConteudoRequisicao } from '../ui/Estados.jsx';
import { DicaGrafico, Variacao, propsEixo } from '../ui/Graficos.jsx';
import { COR_ANTERIOR, COR_ENTRADA, COR_GRADE, COR_OUTROS, COR_SAIDA, criarMapaDeCores } from '../../utils/cores.js';
import { mesCorrente } from '../../utils/datas.js';
import { data, moeda, moedaCompacta, percentual, ROTULO_TIPO_FONTE } from '../../utils/formatadores.js';

const variacaoTotal = (atual, anterior) => (anterior > 0 ? Math.round(((atual - anterior) / anterior) * 10000) / 100 : null);
const tendencia = (atual, anterior) => (atual > anterior ? 'aumento' : atual < anterior ? 'reducao' : 'estavel');
const cursorBarra = { fill: 'rgba(112, 138, 153, 0.08)' };

function LegendaSeries({ series }) {
  return (
    <ul className="legenda legenda--linha" style={{ marginBottom: 12 }}>
      {series.map(({ nome, cor }) => (
        <li key={nome}><span className="amostra" style={{ background: cor }} /><span>{nome}</span></li>
      ))}
    </ul>
  );
}

function TabelaCategorias({ itens, total, totalAnterior, cores, aumentoEhBom }) {
  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <thead>
          <tr>
            <th>Categoria</th>
            <th className="direita">Total</th>
            <th style={{ minWidth: 140 }}>% do total</th>
            <th className="direita">Período anterior</th>
            <th className="direita">Variação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="descricao-celula">
                  {cores && <span className="amostra" style={{ background: cores.get(item.id) ?? COR_OUTROS }} />}
                  {item.nome}
                </span>
              </td>
              <td className="direita numero">{moeda(item.total)}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="barra" style={{ flex: 1 }}>
                    <div className="barra__preenchimento" style={{ width: `${item.percentual}%` }} />
                  </div>
                  <span className="numero texto-fraco" style={{ width: 52, textAlign: 'right' }}>{percentual(item.percentual)}</span>
                </div>
              </td>
              <td className="direita numero texto-suave">{moeda(item.periodoAnterior)}</td>
              <td className="direita">
                <Variacao variacao={item.variacao} tendencia={item.tendencia} aumentoEhBom={aumentoEhBom} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className="direita numero">{moeda(total)}</td>
            <td />
            <td className="direita numero texto-suave">{moeda(totalAnterior)}</td>
            <td className="direita">
              <Variacao variacao={variacaoTotal(total, totalAnterior)} tendencia={tendencia(total, totalAnterior)} aumentoEhBom={aumentoEhBom} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function RelatorioPorCategoria({ periodo }) {
  const relatorio = useRequisicao(() => relatoriosApi.porCategoria(periodo), [periodo.inicio, periodo.fim]);
  const categorias = useRequisicao(() => categoriasApi.listar('saida'), []);
  const cores = useMemo(() => criarMapaDeCores(categorias.dados ?? []), [categorias.dados]);
  const r = relatorio.dados;

  return (
    <ConteudoRequisicao
      carregando={(relatorio.carregando && !r) || categorias.carregando}
      erro={relatorio.erro || categorias.erro}
      recarregar={relatorio.recarregar}
      vazio={r && r.categorias.length === 0 && r.entradas.length === 0}
      vazioProps={{ titulo: 'Sem lançamentos neste período nem no anterior', children: 'Escolha outro período.' }}
    >
      {r && (
        <>
          <p className="texto-fraco">
            Comparando {data(r.periodo.inicio)}–{data(r.periodo.fim)} com o período anterior de mesmo tamanho
            ({data(r.periodoAnterior.inicio)}–{data(r.periodoAnterior.fim)}).
          </p>

          <div className="grade grade--2">
            <section className="card">
              <div className="card__cabecalho">
                <div><h2>Saídas por categoria</h2><p>Participação de cada categoria no total</p></div>
              </div>
              {r.totalSaidas > 0
                ? <RoscaCategorias itens={r.categorias} total={r.totalSaidas} cores={cores} limite={7} />
                : <p className="texto-fraco">Nenhuma saída no período.</p>}
            </section>

            <section className="card">
              <div className="card__cabecalho">
                <div><h2>Atual × anterior</h2><p>Saídas por categoria nos dois períodos</p></div>
              </div>
              <LegendaSeries series={[{ nome: 'Período escolhido', cor: COR_ENTRADA }, { nome: 'Período anterior', cor: COR_ANTERIOR }]} />
              <div className="grafico" style={{ height: Math.max(220, r.categorias.length * 46) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.categorias} layout="vertical" margin={{ left: 8, right: 16 }} barGap={2}>
                    <CartesianGrid horizontal={false} stroke={COR_GRADE} />
                    <XAxis type="number" tickFormatter={moedaCompacta} {...propsEixo} />
                    <YAxis type="category" dataKey="nome" width={104} {...propsEixo} />
                    <Tooltip content={<DicaGrafico />} cursor={cursorBarra} />
                    <Bar dataKey="total" name="Período escolhido" fill={COR_ENTRADA} radius={[0, 4, 4, 0]} barSize={11} isAnimationActive={false} />
                    <Bar dataKey="periodoAnterior" name="Período anterior" fill={COR_ANTERIOR} radius={[0, 4, 4, 0]} barSize={11} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="card">
            <div className="card__cabecalho">
              <div><h2>Saídas por categoria</h2><p>Do maior para o menor gasto · aumento de gasto em vermelho</p></div>
            </div>
            {r.categorias.length > 0
              ? <TabelaCategorias itens={r.categorias} total={r.totalSaidas} totalAnterior={r.totalSaidasAnterior} cores={cores} />
              : <p className="texto-fraco">Nenhuma saída.</p>}
          </section>

          <section className="card">
            <div className="card__cabecalho">
              <div><h2>Entradas por categoria</h2><p>Quanto entrou em cada categoria</p></div>
            </div>
            {r.entradas.length > 0
              ? <TabelaCategorias itens={r.entradas} total={r.totalEntradas} totalAnterior={r.totalEntradasAnterior} aumentoEhBom />
              : <p className="texto-fraco">Nenhuma entrada.</p>}
          </section>
        </>
      )}
    </ConteudoRequisicao>
  );
}

function TabelaSimples({ titulo, descricao, itens, total }) {
  return (
    <section className="card">
      <div className="card__cabecalho"><div><h2>{titulo}</h2><p>{descricao}</p></div></div>
      {itens.length === 0 ? <p className="texto-fraco">Nada no período.</p> : (
        <table className="tabela">
          <thead><tr><th>Nome</th><th className="direita">Total</th><th className="direita">%</th></tr></thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>{item.nome} <span className="texto-fraco">· {ROTULO_TIPO_FONTE[item.tipo]}</span></td>
                <td className="direita numero">{moeda(item.total)}</td>
                <td className="direita numero texto-fraco">{percentual(item.percentual)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total</td><td className="direita numero">{moeda(total)}</td><td /></tr></tfoot>
        </table>
      )}
    </section>
  );
}

function RelatorioPorFonteDestino({ periodo }) {
  const { dados: r, carregando, erro, recarregar } = useRequisicao(
    () => relatoriosApi.porFonteDestino(periodo),
    [periodo.inicio, periodo.fim],
  );

  return (
    <ConteudoRequisicao
      carregando={carregando && !r}
      erro={erro}
      recarregar={recarregar}
      vazio={r?.itens.length === 0}
      vazioProps={{ titulo: 'Sem lançamentos neste período', children: 'Escolha outro período.' }}
    >
      {r && (
        <>
          <section className="card">
            <div className="card__cabecalho">
              <div><h2>Entradas e saídas por fonte/destino</h2><p>Movimentação de cada fonte/destino no período</p></div>
            </div>
            <LegendaSeries series={[{ nome: 'Entradas', cor: COR_ENTRADA }, { nome: 'Saídas', cor: COR_SAIDA }]} />
            <div className="grafico">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.itens} margin={{ left: 8, right: 8 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke={COR_GRADE} />
                  <XAxis dataKey="nome" {...propsEixo} interval={0} />
                  <YAxis tickFormatter={moedaCompacta} width={80} {...propsEixo} />
                  <Tooltip content={<DicaGrafico />} cursor={cursorBarra} />
                  <Bar dataKey="entradas" name="Entradas" fill={COR_ENTRADA} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  <Bar dataKey="saidas" name="Saídas" fill={COR_SAIDA} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grade grade--2">
            <TabelaSimples titulo="Entradas por fonte" descricao="De onde veio o dinheiro" itens={r.fontes} total={r.totalEntradas} />
            <TabelaSimples titulo="Saídas por destino" descricao="Por onde o dinheiro saiu" itens={r.destinos} total={r.totalSaidas} />
          </div>

          <section className="card">
            <div className="card__cabecalho">
              <div><h2>Saldo por conta</h2><p>Entradas − saídas no período, para as fontes/destinos do tipo conta</p></div>
            </div>
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr><th>Conta</th><th className="direita">Entradas</th><th className="direita">Saídas</th><th className="direita">Saldo</th></tr>
                </thead>
                <tbody>
                  {r.contas.map((conta) => (
                    <tr key={conta.id}>
                      <td>{conta.nome} {conta.reserva && <span className="chip chip--alerta">reserva</span>}</td>
                      <td className="direita numero texto-entrada">{moeda(conta.entradas)}</td>
                      <td className="direita numero texto-saida">{moeda(conta.saidas)}</td>
                      <td className={`direita numero ${conta.saldo < 0 ? 'texto-saida' : ''}`}>{moeda(conta.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </ConteudoRequisicao>
  );
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState(mesCorrente);
  const [aba, setAba] = useState('categorias');

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Relatórios</h1>
          <p>Totais calculados no servidor para o período escolhido.</p>
        </div>
        <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} />
      </header>

      <div className="abas" role="tablist" aria-label="Tipo de relatório">
        <button type="button" role="tab" aria-selected={aba === 'categorias'} onClick={() => setAba('categorias')}>Por categoria</button>
        <button type="button" role="tab" aria-selected={aba === 'fontes'} onClick={() => setAba('fontes')}>Por fonte/destino</button>
      </div>

      {aba === 'categorias'
        ? <RelatorioPorCategoria periodo={periodo} />
        : <RelatorioPorFonteDestino periodo={periodo} />}
    </>
  );
}
