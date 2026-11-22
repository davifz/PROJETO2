import axios from 'axios';

const CHAVE_TOKEN = 'polvo.token';
const CHAVE_USUARIO = 'polvo.usuario';

export const sessao = {
  lerToken: () => localStorage.getItem(CHAVE_TOKEN),
  lerUsuario: () => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_USUARIO));
    } catch {
      return null;
    }
  },
  salvar(token, usuario) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  },
  salvarUsuario: (usuario) => localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario)),
  limpar() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
});

let aoExpirarSessao = () => {};
export function definirAoExpirarSessao(funcao) {
  aoExpirarSessao = funcao;
}

export class ErroApi extends Error {
  constructor(erroAxios) {
    const status = erroAxios.response?.status ?? 0;
    const corpo = erroAxios.response?.data;
    let mensagem = corpo?.erro;
    if (!mensagem) {
      mensagem = status === 0
        ? 'Não foi possível conectar à API. Verifique se o back-end está rodando.'
        : 'Ocorreu um erro inesperado. Tente novamente.';
    }
    super(mensagem);
    this.status = status;
    this.campos = corpo?.campos ?? {};
  }
}

api.interceptors.request.use((config) => {
  const token = sessao.lerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const tentativaDeLogin = erro.config?.url?.includes('/auth/login');
    if (erro.response?.status === 401 && !tentativaDeLogin) {
      aoExpirarSessao();
    }
    return Promise.reject(new ErroApi(erro));
  },
);

const dados = (promessa) => promessa.then((resposta) => resposta.data);

const semVazios = (objeto) => Object.fromEntries(
  Object.entries(objeto ?? {}).filter(([, valor]) => valor !== '' && valor !== null && valor !== undefined),
);

export const authApi = {
  cadastrar: (dadosCadastro) => dados(api.post('/auth/cadastro', dadosCadastro)),
  login: (email, senha) => dados(api.post('/auth/login', { email, senha })),
  eu: () => dados(api.get('/auth/me')),
};

export const categoriasApi = {
  listar: (tipo) => dados(api.get('/categorias', { params: semVazios({ tipo }) })),
  criar: (categoria) => dados(api.post('/categorias', categoria)),
  atualizar: (id, categoria) => dados(api.put(`/categorias/${id}`, categoria)),
  excluir: (id, moverPara) => dados(api.delete(`/categorias/${id}`, { params: semVazios({ moverPara }) })),
};

export const fontesDestinosApi = {
  listar: () => dados(api.get('/fontes-destinos')),
  criar: (fonte) => dados(api.post('/fontes-destinos', fonte)),
  atualizar: (id, fonte) => dados(api.put(`/fontes-destinos/${id}`, fonte)),
  excluir: (id) => dados(api.delete(`/fontes-destinos/${id}`)),
};

export const lancamentosApi = {
  listar: (filtros) => dados(api.get('/lancamentos', { params: semVazios(filtros) })),
  buscar: (id) => dados(api.get(`/lancamentos/${id}`)),
  criar: (lancamento) => dados(api.post('/lancamentos', lancamento)),
  atualizar: (id, lancamento) => dados(api.put(`/lancamentos/${id}`, lancamento)),
  excluir: (id, todasParcelas = false) => dados(api.delete(`/lancamentos/${id}`, {
    params: todasParcelas ? { todasParcelas: true } : {},
  })),
};

export const relatoriosApi = {
  porCategoria: ({ inicio, fim }) => dados(api.get('/relatorios/categorias', { params: { inicio, fim } })),
  porFonteDestino: ({ inicio, fim }) => dados(api.get('/relatorios/fontes-destinos', { params: { inicio, fim } })),
  faturas: (meses = 3) => dados(api.get('/relatorios/faturas', { params: { meses } })),
};

export const saudeFinanceiraApi = {
  obter: () => dados(api.get('/saude-financeira')),
};
