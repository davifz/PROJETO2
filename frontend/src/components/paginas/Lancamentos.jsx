// Lançamentos: filtros, totais do período, tabela paginada, criação, edição e exclusão.
import { useEffect, useState } from 'react';
import { useRequisicao } from '../../hooks/useRequisicao.js';
import { categoriasApi, fontesDestinosApi, lancamentosApi } from '../../services/api.js';
import Modal from '../ui/Modal.jsx';
import Paginacao from '../ui/Paginacao.jsx';
import ResumoTotais from '../ui/ResumoTotais.jsx';
import SeletorPeriodo from '../ui/SeletorPeriodo.jsx';
import { Campo } from '../ui/Campo.jsx';
import { ConteudoRequisicao } from '../ui/Estados.jsx';
import { IconeAlerta, IconeCheck, IconeEditar, IconeLixeira, IconeMais } from '../ui/Icones.jsx';
import LancamentoForm from './LancamentoForm.jsx';
import { mesCorrente } from '../../utils/datas.js';
import { data, mesAnoCurto, moeda } from '../../utils/formatadores.js';

const FILTROS_VAZIOS = { tipo: '', categoriaId: '', fonteDestinoId: '' };
const POR_PAGINA = 15;

function ConfirmarExclusao({ lancamento, aoConcluir, aoCancelar }) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');
  const parcelado = lancamento.totalParcelas > 1;

  async function excluir(todasParcelas) {
    setExcluindo(true);
    try {
      await lancamentosApi.excluir(lancamento.id, todasParcelas);
      aoConcluir(todasParcelas && parcelado ? `Compra "${lancamento.descricao}" excluída (todas as parcelas).` : 'Lançamento excluído.');
    } catch (e) {
      setErro(e.message);
      setExcluindo(false);
    }
  }

  return (
    <div className="formulario">
      <p>
        Excluir <strong>{lancamento.descricao}</strong> ({moeda(lancamento.valor)}
        {parcelado && `, parcela ${lancamento.parcelaAtual}/${lancamento.totalParcelas}`})? Esta ação não pode ser desfeita.
      </p>
      {parcelado && (
        <p className="texto-suave">
          Esta compra foi parcelada em {lancamento.totalParcelas}×. Deseja excluir apenas esta parcela ou todas as parcelas da compra?
        </p>
      )}
      {erro && <div className="alerta alerta--erro" role="alert"><IconeAlerta /> {erro}</div>}
      <div className="formulario__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={excluindo}>Cancelar</button>
        {parcelado ? (
          <>
            <button type="button" className="botao botao--secundario" onClick={() => excluir(false)} disabled={excluindo}>
              Só esta parcela
            </button>
            <button type="button" className="botao botao--perigo" onClick={() => excluir(true)} disabled={excluindo}>
              Todas as {lancamento.totalParcelas} parcelas
            </button>
          </>
        ) : (
          <button type="button" className="botao botao--perigo" onClick={() => excluir(false)} disabled={excluindo}>
            {excluindo ? 'Excluindo...' : 'Excluir'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Lancamentos() {
  const [periodo, setPeriodo] = useState(mesCorrente);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [mensagem, setMensagem] = useState('');

  const categorias = useRequisicao(() => categoriasApi.listar(), []);
  const fontes = useRequisicao(() => fontesDestinosApi.listar(), []);
  const lista = useRequisicao(
    () => lancamentosApi.listar({ ...periodo, ...filtros, pagina, porPagina: POR_PAGINA }),
    [periodo.inicio, periodo.fim, filtros.tipo, filtros.categoriaId, filtros.fonteDestinoId, pagina],
  );

  useEffect(() => {
    if (!mensagem) return undefined;
    const temporizador = setTimeout(() => setMensagem(''), 4000);
    return () => clearTimeout(temporizador);
  }, [mensagem]);

  const mudarFiltro = (campo) => (evento) => {
    setFiltros({ ...filtros, [campo]: evento.target.value });
    setPagina(1);
  };
  const mudarPeriodo = (novo) => {
    setPeriodo(novo);
    setPagina(1);
  };
  const temFiltro = Object.values(filtros).some(Boolean);
  const fecharModal = () => setModal(null);

  function aoSalvar(resultado) {
    fecharModal();
    if (resultado?.lancamentos?.length > 1) {
      setMensagem(`Compra parcelada em ${resultado.lancamentos.length}× adicionada.`);
    } else {
      setMensagem(modal?.modo === 'editar' ? 'Lançamento atualizado.' : 'Lançamento adicionado.');
    }
    lista.recarregar();
  }

  function aoExcluir(texto) {
    fecharModal();
    setMensagem(texto);
    if (lista.dados?.itens.length === 1 && pagina > 1) setPagina(pagina - 1);
    else lista.recarregar();
  }

  const categoriasCarregadas = categorias.dados ?? [];
  const fontesCarregadas = fontes.dados ?? [];
  const cadastrosProntos = categorias.dados && fontes.dados;

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Lançamentos</h1>
          <p>Entradas e saídas do período, com filtros.</p>
        </div>
        <div className="cabecalho-pagina__acoes">
          <button type="button" className="botao botao--primario" onClick={() => setModal({ modo: 'novo' })} disabled={!cadastrosProntos}>
            <IconeMais tamanho={18} /> Novo lançamento
          </button>
        </div>
      </header>

      {mensagem && <div className="alerta alerta--info" role="status"><IconeCheck /> {mensagem}</div>}

      <section className="card">
        <div className="filtros">
          <div className="campo campo--largo">
            <span className="campo__rotulo">Período</span>
            <SeletorPeriodo periodo={periodo} aoMudar={mudarPeriodo} />
          </div>
          <Campo id="filtro-tipo" como="select" rotulo="Tipo" value={filtros.tipo} onChange={mudarFiltro('tipo')}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </Campo>
          <Campo id="filtro-categoria" como="select" rotulo="Categoria" value={filtros.categoriaId} onChange={mudarFiltro('categoriaId')}>
            <option value="">Todas</option>
            {categoriasCarregadas
              .filter((c) => !filtros.tipo || c.tipo === filtros.tipo)
              .map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo === 'saida' ? 'saída' : 'entrada'})</option>)}
          </Campo>
          <Campo id="filtro-fonte" como="select" rotulo="Fonte/destino" value={filtros.fonteDestinoId} onChange={mudarFiltro('fonteDestinoId')}>
            <option value="">Todas</option>
            {fontesCarregadas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </Campo>
          {temFiltro && (
            <button type="button" className="botao-link filtros__fim" onClick={() => { setFiltros(FILTROS_VAZIOS); setPagina(1); }}>
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {lista.dados && <ResumoTotais totais={lista.dados.totais} rodape={temFiltro ? 'Considerando os filtros aplicados' : null} />}

      <section className="card">
        <ConteudoRequisicao
          carregando={lista.carregando && !lista.dados}
          erro={lista.erro}
          recarregar={lista.recarregar}
          vazio={lista.dados?.totalItens === 0}
          vazioProps={{
            titulo: temFiltro ? 'Nenhum lançamento com esses filtros' : 'Nenhum lançamento neste período',
            children: temFiltro ? 'Tente remover algum filtro ou mudar o período.' : 'Que tal registrar o primeiro?',
            acao: !temFiltro && cadastrosProntos && (
              <button type="button" className="botao botao--primario botao--pequeno" onClick={() => setModal({ modo: 'novo' })}>
                <IconeMais tamanho={16} /> Novo lançamento
              </button>
            ),
          }}
        >
          <div className="tabela-rolagem">
            <table className="tabela" aria-busy={lista.carregando}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Fonte/destino</th>
                  <th className="direita">Valor</th>
                  <th className="acoes"><span className="visualmente-oculto">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {lista.dados?.itens.map((l) => (
                  <tr key={l.id}>
                    <td className="numero">{data(l.data)}</td>
                    <td>
                      <div className="descricao-celula">
                        <span>{l.descricao}</span>
                        {l.totalParcelas > 1 && <span className="chip" title="Parcela">{l.parcelaAtual}/{l.totalParcelas}</span>}
                      </div>
                    </td>
                    <td><span className="chip">{l.categoriaNome}</span></td>
                    <td>
                      <div className="descricao-celula">
                        <span className="texto-suave">{l.fonteDestinoNome}</span>
                        {l.fatura && (
                          <span className="chip" title={`Fatura que vence em ${data(l.fatura.vencimento)}`}>
                            fatura {mesAnoCurto(l.fatura.referencia)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`direita numero ${l.tipo === 'entrada' ? 'texto-entrada' : 'texto-saida'}`}>
                      {l.tipo === 'entrada' ? '+' : '−'} {moeda(l.valor)}
                    </td>
                    <td className="acoes">
                      <button type="button" className="botao-icone" aria-label={`Editar ${l.descricao}`} onClick={() => setModal({ modo: 'editar', lancamento: l })}>
                        <IconeEditar tamanho={18} />
                      </button>
                      <button type="button" className="botao-icone botao-icone--perigo" aria-label={`Excluir ${l.descricao}`} onClick={() => setModal({ modo: 'excluir', lancamento: l })}>
                        <IconeLixeira tamanho={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lista.dados && (
            <Paginacao pagina={lista.dados.pagina} totalPaginas={lista.dados.totalPaginas} totalItens={lista.dados.totalItens} aoMudar={setPagina} />
          )}
        </ConteudoRequisicao>
      </section>

      <Modal
        aberto={modal?.modo === 'novo' || modal?.modo === 'editar'}
        titulo={modal?.modo === 'editar' ? 'Editar lançamento' : 'Novo lançamento'}
        aoFechar={fecharModal}
        largura={600}
      >
        {cadastrosProntos && (
          <LancamentoForm
            key={modal?.lancamento?.id ?? 'novo'}
            lancamento={modal?.lancamento}
            categorias={categoriasCarregadas}
            fontes={fontesCarregadas}
            aoSalvar={aoSalvar}
            aoCancelar={fecharModal}
          />
        )}
      </Modal>

      <Modal aberto={modal?.modo === 'excluir'} titulo="Excluir lançamento" aoFechar={fecharModal} largura={500}>
        {modal?.modo === 'excluir' && (
          <ConfirmarExclusao lancamento={modal.lancamento} aoConcluir={aoExcluir} aoCancelar={fecharModal} />
        )}
      </Modal>
    </>
  );
}
