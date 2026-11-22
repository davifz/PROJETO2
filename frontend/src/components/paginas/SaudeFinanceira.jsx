import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useRequisicao } from '../../hooks/useRequisicao.js';
import { saudeFinanceiraApi } from '../../services/api.js';
import { ConteudoRequisicao } from '../ui/Estados.jsx';
import { DicaGrafico, propsEixo } from '../ui/Graficos.jsx';
import { IconeAlerta, IconeCheck, IconeInfo } from '../ui/Icones.jsx';
import { COR_DESTAQUE, COR_GRADE, COR_SAIDA, PALETA_SERIES } from '../../utils/cores.js';
import { capitalizar, mesAno, mesAnoCurto, moeda, moedaCompacta, percentual } from '../../utils/formatadores.js';

const STATUS = {
  bom: { texto: 'Bom', Icone: IconeCheck },
  atencao: { texto: 'Atenção', Icone: IconeAlerta },
  critico: { texto: 'Crítico', Icone: IconeAlerta },
  neutro: { texto: 'Informativo', Icone: IconeInfo },
};

function valorDoIndicador(indicador) {
  const { valor, formato } = indicador;
  if (valor === null || valor === undefined) return '—';
  if (formato === 'percentual') return percentual(valor);
  if (formato === 'moeda') return moeda(valor);
  if (formato === 'meses') return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${valor === 1 ? 'mês' : 'meses'}`;
  return String(valor);
}

function Indicador({ indicador }) {
  const status = STATUS[indicador.status] ?? STATUS.neutro;
    const nivel = resumo.percentualUtilizado >= 90 ? 'barra--perigo' : resumopercentualUtilizado >= 20 ? 'barra--alerta' : '';
  return (
    <article className="card indicador">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <h3>{indicador.titulo}</h3>
        <span className={`status status--${indicador.status}`}>
          <status.Icone tamanho={14} /> {status.texto}
        </span>
      </div>
      <div className="indicador__valor">
        {valorDoIndicador(indicador)}
        {indicador.rotuloValor && <small>{indicador.rotuloValor}</small>}
      </div>
      <p className="indicador__dica">{indicador.dica}</p>
      <p className="indicador__descricao">{indicador.descricao}</p>
    </article>
  );
}

function DicaProjecao({ active, payload }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div className="dica-grafico">
      <div className="dica-grafico__titulo">{capitalizar(mesAno(ponto.mes))}{ponto.atual ? ' (atual)' : ''}</div>
      <div className="dica-grafico__linha"><span>Saldo</span><strong className="numero">{moeda(ponto.saldo)}</strong></div>
      {!ponto.atual && (
        <>
          <div className="dica-grafico__linha"><span>Entradas previstas</span><span className="numero">{moeda(ponto.entradas)}</span></div>
          <div className="dica-grafico__linha"><span>Saídas previstas</span><span className="numero">{moeda(ponto.saidas)}</span></div>
          <div className="dica-grafico__linha"><span>…das quais parcelas</span><span className="numero">{moeda(ponto.parcelas)}</span></div>
        </>
      )}
    </div>
  );
}

function Regra503020({ regra }) {
  const itens = [
    { chave: 'necessidades', rotulo: 'Necessidades', cor: PALETA_SERIES[4] },
    { chave: 'desejos', rotulo: 'Desejos', cor: PALETA_SERIES[2] },
    { chave: 'poupanca', rotulo: 'Poupança', cor: PALETA_SERIES[0] },
  ];
  if (!regra.renda) return <p className="texto-fraco">Sem entradas nos últimos 3 meses.</p>;
  return (
    <div className="regra">
      {itens.map(({ chave, rotulo, cor }) => {
        const item = regra[chave];
        const largura = Math.max(0, Math.min(100, item.percentual ?? 0));
        return (
          <div className="regra__item" key={chave}>
            <div className="regra__rotulos">
              <span>{rotulo} <span className="texto-fraco">· {moeda(item.valor)}</span></span>
              <span>
                <strong className={`numero ${item.percentual < 0 ? 'texto-saida' : ''}`}>{percentual(item.percentual)}</strong>
                <span className="texto-fraco"> / referência {item.referencia}%</span>
              </span>
            </div>
            <div className="regra__trilho">
              <div className="regra__barra" style={{ width: `${largura}%`, background: cor }} />
              <div className="regra__meta" style={{ left: `${item.referencia}%` }} title={`Referência: ${item.referencia}%`} />
            </div>
          </div>
        );
      })}
      <p className="texto-fraco">
        Renda dos últimos 3 meses: {moeda(regra.renda)}. Categorias sem classificação contam como desejos; poupança é o que sobrou
        (inclui investimentos). A linha branca marca a referência.
      </p>
    </div>
  );
}

export default function SaudeFinanceira() {
  const { dados, carregando, erro, recarregar } = useRequisicao(() => saudeFinanceiraApi.obter(), []);

  const pontosProjecao = dados
    ? [{ mes: dados.projecao.mesAtual, saldo: dados.projecao.saldoAtual, atual: true }, ...dados.projecao.meses]
    : [];
  const mesNegativo = dados?.projecao.meses.find((m) => m.saldo < 0);

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Saúde financeira</h1>
          <p>Indicadores, projeções e dicas a partir dos seus próprios lançamentos.</p>
        </div>
      </header>

      {/* Aviso obrigatório, sempre visível */}
      <div className="alerta alerta--aviso" role="note">
        <IconeInfo />
        <span>
          {dados?.aviso ?? 'As informações desta página são educativas e não constituem recomendação financeira profissional.'}
        </span>
      </div>

      <ConteudoRequisicao carregando={carregando && !dados} erro={erro} recarregar={recarregar}>
        {dados && (
          <>
            {dados.semHistorico && (
              <div className="alerta alerta--info">
                <IconeInfo /> Ainda há poucos dados. Os indicadores ficam mais precisos com alguns meses de lançamentos.
              </div>
            )}

            <div className="grade grade--auto">
              {dados.indicadores.map((indicador) => <Indicador key={indicador.id} indicador={indicador} />)}
            </div>

            <section className="card">
              <div className="card__cabecalho">
                <div>
                  <h2>Projeção de saldo</h2>
                  <p>
                    Saldo acumulado até {mesAno(dados.projecao.mesAtual)} e previsão para os próximos {dados.projecao.meses.length} meses
                    (média de {moeda(dados.projecao.mediaEntradas)} de entradas e {moeda(dados.projecao.mediaSaidasAVista)} de gastos à vista por mês + parcelas já conhecidas).
                  </p>
                </div>
              </div>
              {mesNegativo && (
                <div className="alerta alerta--erro" role="alert" style={{ marginBottom: 16 }}>
                  <IconeAlerta /> Mantido o ritmo atual, o saldo fica negativo em {mesAno(mesNegativo.mes)}.
                </div>
              )}
              <div className="grafico">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pontosProjecao} margin={{ left: 8, right: 16, top: 8 }}>
                    <CartesianGrid vertical={false} stroke={COR_GRADE} />
                    <XAxis dataKey="mes" tickFormatter={mesAnoCurto} {...propsEixo} />
                    <YAxis tickFormatter={moedaCompacta} width={84} {...propsEixo} />
                    <Tooltip content={<DicaProjecao />} cursor={{ stroke: 'rgba(237, 245, 246, 0.25)' }} />
                    <ReferenceLine y={0} stroke={COR_SAIDA} strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo projetado"
                      stroke={COR_DESTAQUE}
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#0f1b24', stroke: COR_DESTAQUE, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grade grade--2">
              <section className="card">
                <div className="card__cabecalho">
                  <div><h2>Regra 50/30/20</h2><p>Últimos 3 meses completos</p></div>
                </div>
                <Regra503020 regra={dados.regra503020} />
              </section>

              <section className="card">
                <div className="card__cabecalho">
                  <div><h2>Parcelas futuras por mês</h2><p>Pelo vencimento da fatura</p></div>
                </div>
                {dados.parcelasFuturas.length === 0 ? (
                  <p className="texto-fraco">Nenhuma parcela a vencer.</p>
                ) : (
                  <div className="grafico grafico--baixo">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dados.parcelasFuturas} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} stroke={COR_GRADE} />
                        <XAxis dataKey="mes" tickFormatter={mesAnoCurto} {...propsEixo} />
                        <YAxis tickFormatter={moedaCompacta} width={72} {...propsEixo} />
                        <Tooltip content={<DicaGrafico formatarRotulo={(m) => capitalizar(mesAno(m))} />} cursor={{ fill: 'rgba(112, 138, 153, 0.08)' }} />
                        <Bar dataKey="total" name="Parcelas" fill={COR_SAIDA} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>

            {dados.foraDaCurva.length > 0 && (
              <section className="card">
                <div className="card__cabecalho">
                  <div><h2>Categorias fora da curva</h2><p>Gasto deste mês acima da média dos 3 meses anteriores</p></div>
                </div>
                <ul className="lista-simples">
                  {dados.foraDaCurva.map((item) => (
                    <li key={item.categoriaId}>
                      <div className="lista-simples__principal">
                        <strong>{item.categoria}</strong>
                        <span className="texto-fraco">Este mês {moeda(item.atual)} · média {moeda(item.media)}</span>
                      </div>
                      <span className="variacao variacao--ruim">▲ +{percentual(item.percentualAcima)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="texto-fraco">
              Como calculamos: os limites usados em cada dica (ex.: meta de 10% de poupança, 30% da renda em cartões, reserva de
              3 a 6 meses) estão documentados no README do projeto.
            </p>
          </>
        )}
      </ConteudoRequisicao>
    </>
  );
}
