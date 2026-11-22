// Formulário de criação/edição de lançamento (usado dentro de um Modal).
import { useMemo, useState } from 'react';
import { lancamentosApi } from '../../services/api.js';
import { Campo, CampoMoeda } from '../ui/Campo.jsx';
import { IconeAlerta, IconeInfo } from '../ui/Icones.jsx';
import { hojeISO } from '../../utils/datas.js';
import { calcularFatura, dividirEmParcelas } from '../../utils/faturas.js';
import { data as formatarData, mesAno, moeda, ROTULO_TIPO_FONTE } from '../../utils/formatadores.js';

const OPCOES_PARCELAS = Array.from({ length: 48 }, (_, i) => i + 1);

function estadoInicial(lancamento) {
  if (!lancamento) {
    return { tipo: 'saida', descricao: '', valorCentavos: 0, data: hojeISO(), categoriaId: '', fonteDestinoId: '', totalParcelas: 1 };
  }
  return {
    tipo: lancamento.tipo,
    descricao: lancamento.descricao,
    valorCentavos: Math.round(lancamento.valor * 100),
    data: lancamento.data,
    categoriaId: String(lancamento.categoriaId),
    fonteDestinoId: String(lancamento.fonteDestinoId),
    totalParcelas: 1,
  };
}

export default function LancamentoForm({ lancamento, categorias, fontes, aoSalvar, aoCancelar }) {
  const editando = Boolean(lancamento);
  const ehParcelaDeCompra = editando && lancamento.totalParcelas > 1;
  const [formulario, setFormulario] = useState(() => estadoInicial(lancamento));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const categoriasDoTipo = categorias.filter((c) => c.tipo === formulario.tipo);
  const fontesPermitidas = fontes.filter((f) => {
    if (ehParcelaDeCompra) return f.tipo === 'cartao_credito';   // parcelas continuam no cartão
    if (formulario.tipo === 'saida') return f.tipo !== 'renda';    // renda só recebe entradas
    return true;
  });
  const fonteSelecionada = fontes.find((f) => String(f.id) === formulario.fonteDestinoId);
  const ehCartao = fonteSelecionada?.tipo === 'cartao_credito';
  const podeParcelar = !editando && ehCartao && formulario.tipo === 'saida';
  const parcelas = podeParcelar ? Number(formulario.totalParcelas) : 1;

  const alterar = (campo, valor) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  };

  // O erro do servidor vem em "valor", mas o estado guarda centavos.
  const alterarValor = (centavos) => {
    setFormulario((atual) => ({ ...atual, valorCentavos: centavos }));
    if (erros.valor) setErros((atuais) => ({ ...atuais, valor: undefined }));
  };

  // Ao trocar o tipo, limpa a categoria/fonte que deixaram de ser compatíveis.
  const mudarTipo = (tipo) => setFormulario((atual) => {
    const categoriaCompativel = categorias.some((c) => String(c.id) === atual.categoriaId && c.tipo === tipo);
    const fonte = fontes.find((f) => String(f.id) === atual.fonteDestinoId);
    const fonteCompativel = !(tipo === 'saida' && fonte?.tipo === 'renda');
    return {
      ...atual,
      tipo,
      categoriaId: categoriaCompativel ? atual.categoriaId : '',
      fonteDestinoId: fonteCompativel ? atual.fonteDestinoId : '',
      totalParcelas: tipo === 'saida' ? atual.totalParcelas : 1,
    };
  });

  // Prévia de em qual fatura a compra (ou cada parcela) vai cair.
  const previa = useMemo(() => {
    if (!ehCartao || !/^\d{4}-\d{2}-\d{2}$/.test(formulario.data)) return null;
    const cartao = { diaFechamento: fonteSelecionada.diaFechamento, diaVencimento: fonteSelecionada.diaVencimento };
    const numero = editando ? lancamento.parcelaAtual : 1;
    return {
      primeira: calcularFatura(formulario.data, cartao, numero),
      ultima: parcelas > 1 ? calcularFatura(formulario.data, cartao, parcelas) : null,
    };
  }, [ehCartao, fonteSelecionada, formulario.data, parcelas, editando, lancamento]);

  const valoresParcelas = parcelas > 1 && formulario.valorCentavos > 0
    ? dividirEmParcelas(formulario.valorCentavos, parcelas)
    : null;

  function validar() {
    const novos = {};
    if (!formulario.descricao.trim()) novos.descricao = 'Informe a descrição.';
    if (formulario.valorCentavos <= 0) novos.valor = 'O valor deve ser maior que zero.';
    if (!formulario.data) novos.data = 'Informe a data.';
    if (!formulario.categoriaId) novos.categoriaId = 'Escolha a categoria.';
    if (!formulario.fonteDestinoId) novos.fonteDestinoId = 'Escolha a fonte/destino.';
    return novos;
  }

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = validar();
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length > 0) return;

    const corpo = {
      tipo: formulario.tipo,
      descricao: formulario.descricao,
      valor: (formulario.valorCentavos / 100).toFixed(2),
      data: formulario.data,
      categoriaId: Number(formulario.categoriaId),
      fonteDestinoId: Number(formulario.fonteDestinoId),
      totalParcelas: parcelas,
    };

    setEnviando(true);
    try {
      const resultado = editando
        ? await lancamentosApi.atualizar(lancamento.id, corpo)
        : await lancamentosApi.criar(corpo);
      aoSalvar(resultado);
    } catch (erro) {
      setErroGeral(erro.message);
      setErros(erro.campos);
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {erroGeral && <div className="alerta alerta--erro" role="alert"><IconeAlerta /> {erroGeral}</div>}

      {ehParcelaDeCompra && (
        <div className="alerta alerta--info">
          <IconeInfo />
          <span>
            Parcela {lancamento.parcelaAtual}/{lancamento.totalParcelas}. Descrição, data, categoria e cartão serão
            alterados em <strong>todas as parcelas</strong> da compra; o valor muda só nesta parcela.
          </span>
        </div>
      )}

      <div>
        <div className="segmentado" role="group" aria-label="Tipo do lançamento">
          <button type="button" className="segmentado--saida" aria-pressed={formulario.tipo === 'saida'} onClick={() => mudarTipo('saida')} disabled={ehParcelaDeCompra}>
            Saída
          </button>
          <button type="button" className="segmentado--entrada" aria-pressed={formulario.tipo === 'entrada'} onClick={() => mudarTipo('entrada')} disabled={ehParcelaDeCompra}>
            Entrada
          </button>
        </div>
        {erros.tipo && <span className="campo__erro">{erros.tipo}</span>}
      </div>

      <Campo
        id="descricao"
        rotulo="Descrição"
        maxLength={120}
        placeholder={formulario.tipo === 'saida' ? 'Ex.: Supermercado' : 'Ex.: Salário'}
        value={formulario.descricao}
        onChange={(e) => alterar('descricao', e.target.value)}
        erro={erros.descricao}
      />

      <div className="formulario__linha">
        <CampoMoeda
          id="valor"
          rotulo={parcelas > 1 ? 'Valor total da compra' : ehParcelaDeCompra ? 'Valor desta parcela' : 'Valor'}
          centavos={formulario.valorCentavos}
          aoMudar={alterarValor}
          erro={erros.valor}
        />
        <Campo
          id="data"
          rotulo={ehCartao ? 'Data da compra' : 'Data'}
          type="date"
          value={formulario.data}
          onChange={(e) => alterar('data', e.target.value)}
          erro={erros.data}
        />
      </div>

      <div className="formulario__linha">
        <Campo
          id="categoriaId"
          como="select"
          rotulo="Categoria"
          value={formulario.categoriaId}
          onChange={(e) => alterar('categoriaId', e.target.value)}
          erro={erros.categoriaId}
          ajuda={categoriasDoTipo.length === 0 ? 'Cadastre uma categoria deste tipo primeiro.' : undefined}
        >
          <option value="">Selecione...</option>
          {categoriasDoTipo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Campo>
        <Campo
          id="fonteDestinoId"
          como="select"
          rotulo={formulario.tipo === 'entrada' ? 'Fonte (de onde veio)' : 'Destino (por onde saiu)'}
          value={formulario.fonteDestinoId}
          onChange={(e) => alterar('fonteDestinoId', e.target.value)}
          erro={erros.fonteDestinoId}
        >
          <option value="">Selecione...</option>
          {fontesPermitidas.map((f) => (
            <option key={f.id} value={f.id}>{f.nome} — {ROTULO_TIPO_FONTE[f.tipo]}</option>
          ))}
        </Campo>
      </div>

      {podeParcelar && (
        <Campo
          id="totalParcelas"
          como="select"
          rotulo="Parcelas"
          value={formulario.totalParcelas}
          onChange={(e) => alterar('totalParcelas', Number(e.target.value))}
          erro={erros.totalParcelas}
          ajuda={valoresParcelas
            ? `${parcelas}× de ${moeda(valoresParcelas[1] / 100)}`
              + (valoresParcelas[0] !== valoresParcelas[1] ? ` (1ª parcela: ${moeda(valoresParcelas[0] / 100)})` : '')
            : undefined}
        >
          {OPCOES_PARCELAS.map((n) => <option key={n} value={n}>{n === 1 ? 'À vista (1×)' : `${n}×`}</option>)}
        </Campo>
      )}

      {previa && (
        <div className="alerta alerta--info">
          <IconeInfo />
          <span>
            {previa.ultima ? (
              <>
                A 1ª parcela cai na fatura de <strong>{mesAno(previa.primeira.referencia)}</strong> (vence{' '}
                {formatarData(previa.primeira.vencimento)}) e a última na de <strong>{mesAno(previa.ultima.referencia)}</strong>.
              </>
            ) : (
              <>
                Cai na fatura de <strong>{mesAno(previa.primeira.referencia)}</strong>: fecha em{' '}
                {formatarData(previa.primeira.fechamento)} e vence em {formatarData(previa.primeira.vencimento)}.
              </>
            )}
          </span>
        </div>
      )}

      <div className="formulario__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Adicionar lançamento'}
        </button>
      </div>
    </form>
  );
}
