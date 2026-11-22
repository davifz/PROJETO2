// CRUD de categorias (separadas em saídas e entradas).
import { useState } from 'react';
import { useRequisicao } from '../../hooks/useRequisicao.js';
import { categoriasApi } from '../../services/api.js';
import Modal from '../ui/Modal.jsx';
import { Campo } from '../ui/Campo.jsx';
import { ConteudoRequisicao } from '../ui/Estados.jsx';
import { IconeAlerta, IconeCheck, IconeEditar, IconeLixeira, IconeMais } from '../ui/Icones.jsx';
import { ROTULO_GRUPO } from '../../utils/formatadores.js';

function CategoriaForm({ categoria, tipoInicial, aoSalvar, aoCancelar }) {
  const [formulario, setFormulario] = useState({
    nome: categoria?.nome ?? '',
    tipo: categoria?.tipo ?? tipoInicial,
    grupoOrcamento: categoria?.grupoOrcamento ?? '',
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const tipoTravado = Boolean(categoria && categoria.totalLancamentos > 0);

  async function enviar(evento) {
    evento.preventDefault();
    if (!formulario.nome.trim()) {
      setErros({ nome: 'Informe o nome.' });
      return;
    }
    setEnviando(true);
    setErroGeral('');
    const corpo = { ...formulario, grupoOrcamento: formulario.tipo === 'saida' ? formulario.grupoOrcamento || null : null };
    try {
      const salva = categoria ? await categoriasApi.atualizar(categoria.id, corpo) : await categoriasApi.criar(corpo);
      aoSalvar(salva, Boolean(categoria));
    } catch (erro) {
      setErroGeral(erro.message);
      setErros(erro.campos);
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {erroGeral && <div className="alerta alerta--erro" role="alert"><IconeAlerta /> {erroGeral}</div>}
      <Campo
        id="nome"
        rotulo="Nome"
        maxLength={60}
        value={formulario.nome}
        onChange={(e) => { setFormulario({ ...formulario, nome: e.target.value }); setErros({}); }}
        erro={erros.nome}
      />
      <div>
        <span className="campo__rotulo">Tipo</span>
        <div className="segmentado" role="group" aria-label="Tipo da categoria" style={{ marginTop: 6 }}>
          {['saida', 'entrada'].map((tipo) => (
            <button
              key={tipo}
              type="button"
              className={`segmentado--${tipo}`}
              aria-pressed={formulario.tipo === tipo}
              disabled={tipoTravado}
              onClick={() => setFormulario({ ...formulario, tipo })}
            >
              {tipo === 'saida' ? 'Saída' : 'Entrada'}
            </button>
          ))}
        </div>
        {(erros.tipo || tipoTravado) && (
          <span className={erros.tipo ? 'campo__erro' : 'campo__ajuda'}>
            {erros.tipo ?? 'O tipo não pode mudar porque a categoria já tem lançamentos.'}
          </span>
        )}
      </div>
      {formulario.tipo === 'saida' && (
        <Campo
          id="grupoOrcamento"
          como="select"
          rotulo="Grupo na regra 50/30/20"
          value={formulario.grupoOrcamento}
          onChange={(e) => setFormulario({ ...formulario, grupoOrcamento: e.target.value })}
          ajuda="Usado na página de saúde financeira."
        >
          <option value="">Sem classificação (conta como desejo)</option>
          <option value="necessidade">Necessidade</option>
          <option value="desejo">Desejo</option>
          <option value="poupanca">Poupança / investimento</option>
        </Campo>
      )}
      <div className="formulario__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? 'Salvando...' : categoria ? 'Salvar' : 'Criar categoria'}
        </button>
      </div>
    </form>
  );
}

function ExcluirCategoria({ categoria, outras, aoConcluir, aoCancelar }) {
  const [destino, setDestino] = useState('');
  const [erro, setErro] = useState('');
  const [aviso409, setAviso409] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const opcoes = outras.filter((c) => c.tipo === categoria.tipo && c.id !== categoria.id);

  async function excluir() {
    setExcluindo(true);
    setErro('');
    try {
      await categoriasApi.excluir(categoria.id, aviso409 ? destino : undefined);
      aoConcluir();
    } catch (e) {
      if (e.status === 409) setAviso409(e.message);
      else setErro(e.campos?.moverPara ?? e.message);
      setExcluindo(false);
    }
  }

  return (
    <div className="formulario">
      {aviso409 ? (
        <>
          <div className="alerta alerta--aviso" role="alert"><IconeAlerta /> <span>{aviso409}</span></div>
          <Campo id="moverPara" como="select" rotulo="Mover os lançamentos para" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Selecione...</option>
            {opcoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Campo>
        </>
      ) : (
        <p>Excluir a categoria <strong>{categoria.nome}</strong>? Esta ação não pode ser desfeita.</p>
      )}
      {erro && <div className="alerta alerta--erro" role="alert"><IconeAlerta /> {erro}</div>}
      <div className="formulario__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="button" className="botao botao--perigo" onClick={excluir} disabled={excluindo || Boolean(aviso409 && !destino)}>
          {aviso409 ? 'Mover e excluir' : 'Excluir'}
        </button>
      </div>
    </div>
  );
}

function ListaCategorias({ titulo, descricao, itens, aoEditar, aoExcluir, aoNova }) {
  return (
    <section className="card">
      <div className="card__cabecalho">
        <div>
          <h2>{titulo}</h2>
          <p>{descricao}</p>
        </div>
        <button type="button" className="botao botao--secundario botao--pequeno" onClick={aoNova}>
          <IconeMais tamanho={16} /> Nova
        </button>
      </div>
      {itens.length === 0 ? (
        <p className="texto-fraco">Nenhuma categoria.</p>
      ) : (
        <ul className="lista-simples">
          {itens.map((c) => (
            <li key={c.id}>
              <div className="lista-simples__principal">
                <strong>{c.nome}</strong>
                <span className="texto-fraco">
                  {c.totalLancamentos} {c.totalLancamentos === 1 ? 'lançamento' : 'lançamentos'}
                </span>
              </div>
              {c.grupoOrcamento && <span className="chip">{ROTULO_GRUPO[c.grupoOrcamento]}</span>}
              <button type="button" className="botao-icone" aria-label={`Editar ${c.nome}`} onClick={() => aoEditar(c)}>
                <IconeEditar tamanho={18} />
              </button>
              <button type="button" className="botao-icone botao-icone--perigo" aria-label={`Excluir ${c.nome}`} onClick={() => aoExcluir(c)}>
                <IconeLixeira tamanho={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Categorias() {
  const { dados, carregando, erro, recarregar } = useRequisicao(() => categoriasApi.listar(), []);
  const [modal, setModal] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const fechar = () => setModal(null);

  const concluir = (texto) => {
    fechar();
    setMensagem(texto);
    recarregar();
  };

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Categorias</h1>
          <p>Classifique seus lançamentos. Cada categoria é de entrada ou de saída.</p>
        </div>
        <button type="button" className="botao botao--primario" onClick={() => setModal({ modo: 'form', tipo: 'saida' })}>
          <IconeMais tamanho={18} /> Nova categoria
        </button>
      </header>

      {mensagem && <div className="alerta alerta--info" role="status"><IconeCheck /> {mensagem}</div>}

      <ConteudoRequisicao
        carregando={carregando && !dados}
        erro={erro}
        recarregar={recarregar}
        vazio={dados?.length === 0}
        vazioProps={{ titulo: 'Nenhuma categoria cadastrada' }}
      >
        {dados && (
          <div className="grade grade--2">
            <ListaCategorias
              titulo="Saídas"
              descricao="Para onde o dinheiro vai"
              itens={dados.filter((c) => c.tipo === 'saida')}
              aoNova={() => setModal({ modo: 'form', tipo: 'saida' })}
              aoEditar={(categoria) => setModal({ modo: 'form', categoria })}
              aoExcluir={(categoria) => setModal({ modo: 'excluir', categoria })}
            />
            <ListaCategorias
              titulo="Entradas"
              descricao="De onde o dinheiro vem"
              itens={dados.filter((c) => c.tipo === 'entrada')}
              aoNova={() => setModal({ modo: 'form', tipo: 'entrada' })}
              aoEditar={(categoria) => setModal({ modo: 'form', categoria })}
              aoExcluir={(categoria) => setModal({ modo: 'excluir', categoria })}
            />
          </div>
        )}
      </ConteudoRequisicao>

      <Modal aberto={modal?.modo === 'form'} titulo={modal?.categoria ? 'Editar categoria' : 'Nova categoria'} aoFechar={fechar}>
        {modal?.modo === 'form' && (
          <CategoriaForm
            categoria={modal.categoria}
            tipoInicial={modal.tipo}
            aoCancelar={fechar}
            aoSalvar={(salva, editou) => concluir(`Categoria "${salva.nome}" ${editou ? 'atualizada' : 'criada'}.`)}
          />
        )}
      </Modal>

      <Modal aberto={modal?.modo === 'excluir'} titulo="Excluir categoria" aoFechar={fechar}>
        {modal?.modo === 'excluir' && (
          <ExcluirCategoria
            categoria={modal.categoria}
            outras={dados ?? []}
            aoCancelar={fechar}
            aoConcluir={() => concluir(`Categoria "${modal.categoria.nome}" excluída.`)}
          />
        )}
      </Modal>
    </>
  );
}
