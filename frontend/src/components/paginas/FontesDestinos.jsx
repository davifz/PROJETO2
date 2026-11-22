// CRUD de fontes/destinos: rendas, contas e cartões de crédito.
import { useState } from 'react';
import { useRequisicao } from '../../hooks/useRequisicao.js';
import { fontesDestinosApi } from '../../services/api.js';
import Modal from '../ui/Modal.jsx';
import { Campo, CampoMoeda } from '../ui/Campo.jsx';
import { ConteudoRequisicao } from '../ui/Estados.jsx';
import {
  IconeAlerta, IconeBanco, IconeCartao, IconeCheck, IconeEditar, IconeLixeira, IconeMais, IconeRenda,
} from '../ui/Icones.jsx';
import { moeda, ROTULO_TIPO_FONTE } from '../../utils/formatadores.js';

const SECOES = [
  { tipo: 'renda', titulo: 'Rendas', descricao: 'De onde vem o dinheiro (salário, freelances...)', Icone: IconeRenda },
  { tipo: 'conta', titulo: 'Contas', descricao: 'Onde o dinheiro fica (conta corrente, poupança, carteira...)', Icone: IconeBanco },
  { tipo: 'cartao_credito', titulo: 'Cartões de crédito', descricao: 'Compras que vão para a fatura', Icone: IconeCartao },
];

function FonteForm({ fonte, aoSalvar, aoCancelar }) {
  const [formulario, setFormulario] = useState({
    nome: fonte?.nome ?? '',
    tipo: fonte?.tipo ?? 'conta',
    diaFechamento: fonte?.diaFechamento ?? '',
    diaVencimento: fonte?.diaVencimento ?? '',
    limiteCentavos: fonte?.limite ? Math.round(fonte.limite * 100) : 0,
    reserva: fonte?.reserva ?? false,
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ehCartao = formulario.tipo === 'cartao_credito';
  const tipoTravado = Boolean(fonte && fonte.totalLancamentos > 0);

  const alterar = (campo) => (evento) => {
    const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
    setFormulario({ ...formulario, [campo]: valor });
    if (erros[campo]) setErros({ ...erros, [campo]: undefined });
  };

  function validar() {
    const novos = {};
    if (!formulario.nome.trim()) novos.nome = 'Informe o nome.';
    if (ehCartao) {
      const diaValido = (dia) => Number.isInteger(Number(dia)) && Number(dia) >= 1 && Number(dia) <= 31;
      if (!diaValido(formulario.diaFechamento) || formulario.diaFechamento === '') novos.diaFechamento = 'Dia de 1 a 31.';
      if (!diaValido(formulario.diaVencimento) || formulario.diaVencimento === '') novos.diaVencimento = 'Dia de 1 a 31.';
      if (!formulario.limiteCentavos) novos.limite = 'Informe o limite.';
    }
    return novos;
  }

  async function enviar(evento) {
    evento.preventDefault();
    const novos = validar();
    setErros(novos);
    setErroGeral('');
    if (Object.keys(novos).length > 0) return;

    const corpo = {
      nome: formulario.nome,
      tipo: formulario.tipo,
      diaFechamento: ehCartao ? Number(formulario.diaFechamento) : null,
      diaVencimento: ehCartao ? Number(formulario.diaVencimento) : null,
      limite: ehCartao ? (formulario.limiteCentavos / 100).toFixed(2) : null,
      reserva: formulario.tipo === 'conta' && formulario.reserva,
    };
    setEnviando(true);
    try {
      const salva = fonte ? await fontesDestinosApi.atualizar(fonte.id, corpo) : await fontesDestinosApi.criar(corpo);
      aoSalvar(salva, Boolean(fonte));
    } catch (erro) {
      setErroGeral(erro.message);
      setErros(erro.campos);
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {erroGeral && <div className="alerta alerta--erro" role="alert"><IconeAlerta /> {erroGeral}</div>}
      <Campo id="nome" rotulo="Nome" maxLength={60} placeholder="Ex.: Nubank" value={formulario.nome} onChange={alterar('nome')} erro={erros.nome} />
      <Campo
        id="tipo"
        como="select"
        rotulo="Tipo"
        value={formulario.tipo}
        onChange={alterar('tipo')}
        disabled={tipoTravado}
        erro={erros.tipo}
        ajuda={tipoTravado ? 'O tipo não pode mudar porque há lançamentos vinculados.' : undefined}
      >
        <option value="renda">Renda (fonte de entradas)</option>
        <option value="conta">Conta</option>
        <option value="cartao_credito">Cartão de crédito</option>
      </Campo>

      {ehCartao && (
        <>
          <div className="formulario__linha">
            <Campo id="diaFechamento" rotulo="Dia de fechamento" type="number" min={1} max={31} value={formulario.diaFechamento} onChange={alterar('diaFechamento')} erro={erros.diaFechamento} />
            <Campo id="diaVencimento" rotulo="Dia de vencimento" type="number" min={1} max={31} value={formulario.diaVencimento} onChange={alterar('diaVencimento')} erro={erros.diaVencimento} />
          </div>
          <CampoMoeda
            id="limite"
            rotulo="Limite"
            centavos={formulario.limiteCentavos}
            aoMudar={(centavos) => { setFormulario({ ...formulario, limiteCentavos: centavos }); setErros({ ...erros, limite: undefined }); }}
            erro={erros.limite}
          />
          <p className="texto-fraco">
            Compras feitas antes do dia de fechamento entram na fatura do mês; a partir dele, na do mês seguinte.
          </p>
        </>
      )}

      {formulario.tipo === 'conta' && (
        <label className="caixa-selecao" htmlFor="reserva">
          <input id="reserva" type="checkbox" checked={formulario.reserva} onChange={alterar('reserva')} />
          É minha reserva de emergência
        </label>
      )}

      <div className="formulario__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? 'Salvando...' : fonte ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}

function ExcluirFonte({ fonte, aoConcluir, aoCancelar }) {
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true);
    try {
      await fontesDestinosApi.excluir(fonte.id);
      aoConcluir();
    } catch (e) {
      setErro(e.message);       // 409 quando há lançamentos vinculados
      setExcluindo(false);
    }
  }

  return (
    <div className="formulario">
      <p>Excluir <strong>{fonte.nome}</strong> ({ROTULO_TIPO_FONTE[fonte.tipo].toLowerCase()})? Esta ação não pode ser desfeita.</p>
      {erro && <div className="alerta alerta--erro" role="alert"><IconeAlerta /> <span>{erro}</span></div>}
      <div className="formulario__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>{erro ? 'Fechar' : 'Cancelar'}</button>
        {!erro && (
          <button type="button" className="botao botao--perigo" onClick={excluir} disabled={excluindo}>Excluir</button>
        )}
      </div>
    </div>
  );
}

function CartaoFonte({ fonte, Icone, aoEditar, aoExcluir }) {
  const ehCartao = fonte.tipo === 'cartao_credito';
  return (
    <article className={`card cartao-fonte ${ehCartao ? 'cartao-fonte--cartao' : ''}`}>
      <div className="cartao-fonte__topo">
        <span className="cartao-fonte__icone"><Icone /></span>
        <div className="cartao-fonte__info">
          <strong>{fonte.nome}</strong>
          <span className="texto-fraco">
            {ROTULO_TIPO_FONTE[fonte.tipo]} · {fonte.totalLancamentos} {fonte.totalLancamentos === 1 ? 'lançamento' : 'lançamentos'}
          </span>
        </div>
      </div>
      <div className="cartao-fonte__rodape">
        <div className="cartao-fonte__detalhes">
          {ehCartao && (
            <>
              <span className="chip">Fecha dia {fonte.diaFechamento}</span>
              <span className="chip">Vence dia {fonte.diaVencimento}</span>
              <span className="chip chip--entrada">Limite {moeda(fonte.limite)}</span>
            </>
          )}
          {fonte.reserva && <span className="chip chip--alerta">Reserva de emergência</span>}
        </div>
        <div className="cartao-fonte__acoes">
          <button type="button" className="botao-icone" aria-label={`Editar ${fonte.nome}`} onClick={aoEditar}><IconeEditar tamanho={18} /></button>
          <button type="button" className="botao-icone botao-icone--perigo" aria-label={`Excluir ${fonte.nome}`} onClick={aoExcluir}><IconeLixeira tamanho={18} /></button>
        </div>
      </div>
    </article>
  );
}

export default function FontesDestinos() {
  const { dados, carregando, erro, recarregar } = useRequisicao(() => fontesDestinosApi.listar(), []);
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
          <h1>Fontes e destinos</h1>
          <p>De onde o dinheiro vem e por onde ele sai.</p>
        </div>
        <button type="button" className="botao botao--primario" onClick={() => setModal({ modo: 'form' })}>
          <IconeMais tamanho={18} /> Nova fonte/destino
        </button>
      </header>

      {mensagem && <div className="alerta alerta--info" role="status"><IconeCheck /> {mensagem}</div>}

      <ConteudoRequisicao carregando={carregando && !dados} erro={erro} recarregar={recarregar}>
        {dados && SECOES.map(({ tipo, titulo, descricao, Icone }) => {
          const itens = dados.filter((f) => f.tipo === tipo);
          return (
            <section key={tipo}>
              <div className="secao-titulo">
                <h2>{titulo}</h2>
                <span className="texto-fraco">{descricao}</span>
              </div>
              {itens.length === 0 ? (
                <div className="card"><p className="texto-fraco">Nenhum item deste tipo.</p></div>
              ) : (
                <div className="grade grade--auto">
                  {itens.map((fonte) => (
                    <CartaoFonte
                      key={fonte.id}
                      fonte={fonte}
                      Icone={Icone}
                      aoEditar={() => setModal({ modo: 'form', fonte })}
                      aoExcluir={() => setModal({ modo: 'excluir', fonte })}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </ConteudoRequisicao>

      <Modal aberto={modal?.modo === 'form'} titulo={modal?.fonte ? 'Editar fonte/destino' : 'Nova fonte/destino'} aoFechar={fechar}>
        {modal?.modo === 'form' && (
          <FonteForm
            fonte={modal.fonte}
            aoCancelar={fechar}
            aoSalvar={(salva, editou) => concluir(`"${salva.nome}" ${editou ? 'atualizado' : 'criado'} com sucesso.`)}
          />
        )}
      </Modal>
      <Modal aberto={modal?.modo === 'excluir'} titulo="Excluir fonte/destino" aoFechar={fechar}>
        {modal?.modo === 'excluir' && (
          <ExcluirFonte fonte={modal.fonte} aoCancelar={fechar} aoConcluir={() => concluir(`"${modal.fonte.nome}" excluído.`)} />
        )}
      </Modal>
    </>
  );
}
