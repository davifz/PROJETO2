// Contexto de autenticação: usuário logado, token e as funções login, logout e cadastrar.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, definirAoExpirarSessao, sessao } from '../services/api.js';

const AuthContext = createContext(null);
const AVISO_EXPIRADA = 'Sua sessão expirou. Entre novamente.';

// Lê o "exp" (expiração, em segundos) do payload do JWT, sem validar a assinatura
// (quem valida é o servidor; aqui só queremos saber quando ele vai expirar).
function lerExpiracao(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => sessao.lerToken());
  const [usuario, setUsuario] = useState(() => sessao.lerUsuario());

  const encerrarSessao = useCallback((aviso) => {
    sessao.limpar();
    setToken(null);
    setUsuario(null);
    navigate('/login', { replace: true, state: aviso ? { aviso } : null });
  }, [navigate]);

  const logout = useCallback(() => encerrarSessao(), [encerrarSessao]);

  // Qualquer 401 recebido pelo cliente HTTP encerra a sessão.
  useEffect(() => {
    definirAoExpirarSessao(() => encerrarSessao(AVISO_EXPIRADA));
  }, [encerrarSessao]);

  // Volta ao login sozinho quando o token expira, mesmo sem nenhuma requisição.
  useEffect(() => {
    if (!token) return undefined;
    const expiraEm = lerExpiracao(token);
    if (!expiraEm) return undefined;
    const restante = expiraEm - Date.now();
    if (restante <= 0) {
      encerrarSessao(AVISO_EXPIRADA);
      return undefined;
    }
    const temporizador = setTimeout(() => encerrarSessao(AVISO_EXPIRADA), Math.min(restante, 2 ** 31 - 1));
    return () => clearTimeout(temporizador);
  }, [token, encerrarSessao]);

  // Ao abrir a aplicação já logado, confirma o token e atualiza os dados do usuário.
  useEffect(() => {
    if (!sessao.lerToken()) return;
    authApi.eu()
      .then((dadosUsuario) => {
        setUsuario(dadosUsuario);
        sessao.salvarUsuario(dadosUsuario);
      })
      .catch(() => {}); // 401 já é tratado pelo cliente HTTP
  }, []);

  const login = useCallback(async (email, senha) => {
    const resposta = await authApi.login(email, senha);
    sessao.salvar(resposta.token, resposta.usuario);
    setToken(resposta.token);
    setUsuario(resposta.usuario);
    return resposta.usuario;
  }, []);

  // Cadastra e já entra na conta.
  const cadastrar = useCallback(async (dadosCadastro) => {
    await authApi.cadastrar(dadosCadastro);
    return login(dadosCadastro.email, dadosCadastro.senha);
  }, [login]);

  const valor = useMemo(() => ({
    token,
    usuario,
    autenticado: Boolean(token),
    login,
    logout,
    cadastrar,
  }), [token, usuario, login, logout, cadastrar]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return contexto;
}
