import { ErroHttp } from './erros.js';
import { cpfValido, somenteDigitos } from '../models/regras/cpf.js';
import { dataValida, hojeISO, inicioDoMes, fimDoMes, diasNoPeriodo } from '../models/regras/datas.js';
import { paraCentavos, VALOR_MAXIMO_CENTAVOS } from '../models/regras/dinheiro.js';

export const TIPOS_LANCAMENTO = ['entrada', 'saida'];
export const TIPOS_FONTE = ['renda', 'conta', 'cartao_credito'];
export const GRUPOS_ORCAMENTO = ['necessidade', 'desejo', 'poupanca'];
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Funções Auxiliares

// aceita só string, troca caracteres de controle por espaço, junta espaços repetidos e remove espaços nas pontas.
export function textoLimpo(valor) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Inteiro positivo vindo de número ou texto ("12"); senão, null.
export function inteiroPositivo(valor) {
  const numero = typeof valor === 'string' && /^\d{1,10}$/.test(valor.trim()) ? Number(valor) : valor;
  return Number.isInteger(numero) && numero > 0 && numero <= 2_147_483_647 ? numero : null;
}

function falharSeHouverErros(campos) {
  if (Object.keys(campos).length > 0) throw new ErroHttp(400, 'Dados inválidos.', campos);
}

// Id da URL (/recurso/:id). Id malformado = recurso inexistente → 404.
export function idDaUrl(req) {
  const id = inteiroPositivo(req.params.id);
  if (!id) throw new ErroHttp(404, 'Registro não encontrado.');
  return id;
}

const valorBooleano = (valor) => valor === true || valor === 'true';

// Funções de Autenticação

export function validarCadastro(req, res, next) {
  const corpo = req.body ?? {};
  const nome = textoLimpo(corpo.nome);
  const email = textoLimpo(corpo.email).toLowerCase();
  const cpf = somenteDigitos(typeof corpo.cpf === 'string' ? corpo.cpf : '');
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  const confirmacaoSenha = typeof corpo.confirmacaoSenha === 'string' ? corpo.confirmacaoSenha : '';

  const campos = {};
  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 120) campos.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (!email) campos.email = 'Informe o e-mail.';
  else if (email.length > 160 || !RE_EMAIL.test(email)) campos.email = 'Informe um e-mail válido.';

  if (!cpf) campos.cpf = 'Informe o CPF.';
  else if (!cpfValido(cpf)) campos.cpf = 'CPF inválido.';

  if (!senha) campos.senha = 'Informe a senha.';
  else if (senha.length < 8 || !/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) {
    campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  } else if (senha.length > 72) campos.senha = 'A senha deve ter no máximo 72 caracteres.';

  if (!confirmacaoSenha) campos.confirmacaoSenha = 'Confirme a senha.';
  else if (confirmacaoSenha !== senha) campos.confirmacaoSenha = 'As senhas não conferem.';

  falharSeHouverErros(campos);
  req.dados = { nome, email, cpf, senha };
  next();
}

export function validarLogin(req, res, next) {
  const corpo = req.body ?? {};
  const email = textoLimpo(corpo.email).toLowerCase();
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  const campos = {};
  if (!email) campos.email = 'Informe o e-mail.';
  if (!senha) campos.senha = 'Informe a senha.';
  falharSeHouverErros(campos);
  req.dados = { email, senha };
  next();
}

// Funções de Categorias

export function validarCategoria(req, res, next) {
  const corpo = req.body ?? {};
  const nome = textoLimpo(corpo.nome);
  const tipo = corpo.tipo;
  let grupoOrcamento = corpo.grupoOrcamento || null;

  const campos = {};
  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  if (!TIPOS_LANCAMENTO.includes(tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  if (grupoOrcamento !== null && !GRUPOS_ORCAMENTO.includes(grupoOrcamento)) {
    campos.grupoOrcamento = 'Grupo inválido (necessidade, desejo ou poupanca).';
  }
  falharSeHouverErros(campos);

  if (tipo === 'entrada') grupoOrcamento = null;      // 50/30/20 só se aplica a saídas
  req.dados = { nome, tipo, grupoOrcamento };
  next();
}

// Fontes/destinos

export function validarFonteDestino(req, res, next) {
  const corpo = req.body ?? {};
  const nome = textoLimpo(corpo.nome);
  const tipo = corpo.tipo;

  const campos = {};
  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  if (!TIPOS_FONTE.includes(tipo)) campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';

  let diaFechamento = null;
  let diaVencimento = null;
  let limiteCentavos = null;

  if (tipo === 'cartao_credito') {
    diaFechamento = inteiroPositivo(corpo.diaFechamento);
    diaVencimento = inteiroPositivo(corpo.diaVencimento);
    limiteCentavos = corpo.limite === undefined || corpo.limite === null || corpo.limite === ''
      ? null
      : paraCentavos(corpo.limite);

    if (!diaFechamento || diaFechamento > 31) campos.diaFechamento = 'Informe o dia de fechamento (1 a 31).';
    if (!diaVencimento || diaVencimento > 31) campos.diaVencimento = 'Informe o dia de vencimento (1 a 31).';
    if (limiteCentavos === null) campos.limite = 'Informe o limite do cartão.';
    else if (limiteCentavos < 0 || limiteCentavos > VALOR_MAXIMO_CENTAVOS) campos.limite = 'Limite inválido.';
  }

  falharSeHouverErros(campos);
  req.dados = {
    nome,
    tipo,
    diaFechamento,
    diaVencimento,
    limiteCentavos,
    reserva: tipo === 'conta' && valorBooleano(corpo.reserva),
  };
  next();
}

// Lançamentos no Sistema

export function validarLancamento(req, res, next) {
  const corpo = req.body ?? {};
  const tipo = corpo.tipo;
  const descricao = textoLimpo(corpo.descricao);
  const valorCentavos = paraCentavos(corpo.valor);
  const data = corpo.data;
  const categoriaId = inteiroPositivo(corpo.categoriaId);
  const fonteDestinoId = inteiroPositivo(corpo.fonteDestinoId);
  const totalParcelas = corpo.totalParcelas === undefined || corpo.totalParcelas === null || corpo.totalParcelas === ''
    ? 1
    : inteiroPositivo(corpo.totalParcelas);

  const campos = {};
  if (!TIPOS_LANCAMENTO.includes(tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';

  if (!descricao) campos.descricao = 'Informe a descrição.';
  else if (descricao.length > 120) campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';

  if (corpo.valor === undefined || corpo.valor === null || corpo.valor === '') campos.valor = 'Informe o valor.';
  else if (valorCentavos === null && /^-/.test(String(corpo.valor).trim())) campos.valor = 'O valor deve ser maior que zero.';
  else if (valorCentavos === null) campos.valor = 'Valor inválido (use no máximo 2 casas decimais).';
  else if (valorCentavos <= 0) campos.valor = 'O valor deve ser maior que zero.';
  else if (valorCentavos > VALOR_MAXIMO_CENTAVOS) campos.valor = 'Valor alto demais.';

  if (!data) campos.data = 'Informe a data.';
  else if (!dataValida(data)) campos.data = 'Data inválida (use AAAA-MM-DD).';

  if (!categoriaId) campos.categoriaId = 'Informe a categoria.';
  if (!fonteDestinoId) campos.fonteDestinoId = 'Informe a fonte/destino.';
  if (!totalParcelas || totalParcelas > 48) campos.totalParcelas = 'O número de parcelas deve ser de 1 a 48.';

  falharSeHouverErros(campos);
  req.dados = { tipo, descricao, valorCentavos, data, categoriaId, fonteDestinoId, totalParcelas };
  next();
}

// Filtros de período (query string)

// Lê ?inicio=&fim=. Sem eles, usa o mês corrente.
function lerPeriodo(query, campos) {
  const hoje = hojeISO();
  const inicio = query.inicio || inicioDoMes(hoje);
  const fim = query.fim || fimDoMes(hoje);
  if (!dataValida(inicio)) campos.inicio = 'Data inicial inválida (use AAAA-MM-DD).';
  if (!dataValida(fim)) campos.fim = 'Data final inválida (use AAAA-MM-DD).';
  if (!campos.inicio && !campos.fim) {
    if (inicio > fim) campos.fim = 'A data final deve ser igual ou posterior à inicial.';
    else if (diasNoPeriodo(inicio, fim) > 3700) campos.fim = 'O período pode ter no máximo 10 anos.';
  }
  return { inicio, fim };
}

export function validarPeriodo(req, res, next) {
  const campos = {};
  const periodo = lerPeriodo(req.query, campos);
  falharSeHouverErros(campos);
  req.filtros = periodo;
  next();
}

export function validarFiltrosLancamentos(req, res, next) {
  const query = req.query;
  const campos = {};
  const { inicio, fim } = lerPeriodo(query, campos);

  const filtros = { inicio, fim, tipo: null, categoriaId: null, fonteDestinoId: null };

  if (query.tipo) {
    if (TIPOS_LANCAMENTO.includes(query.tipo)) filtros.tipo = query.tipo;
    else campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }
  if (query.categoriaId) {
    filtros.categoriaId = inteiroPositivo(query.categoriaId);
    if (!filtros.categoriaId) campos.categoriaId = 'Categoria inválida.';
  }
  if (query.fonteDestinoId) {
    filtros.fonteDestinoId = inteiroPositivo(query.fonteDestinoId);
    if (!filtros.fonteDestinoId) campos.fonteDestinoId = 'Fonte/destino inválido.';
  }

  filtros.pagina = query.pagina ? inteiroPositivo(query.pagina) : 1;
  if (!filtros.pagina) campos.pagina = 'Página inválida.';
  filtros.porPagina = query.porPagina ? inteiroPositivo(query.porPagina) : 20;
  if (!filtros.porPagina || filtros.porPagina > 100) campos.porPagina = 'Use de 1 a 100 itens por página.';

  falharSeHouverErros(campos);
  req.filtros = filtros;
  next();
}
