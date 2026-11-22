import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LayoutAutenticacao from '../layout/LayoutAutenticacao.jsx';
import { Campo } from '../ui/Campo.jsx';
import { IconeAlerta, IconeInfo } from '../ui/Icones.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formulario, setFormulario] = useState({ email: '', senha: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const aviso = location.state?.aviso;
  const alterar = (campo) => (evento) => setFormulario({ ...formulario, [campo]: evento.target.value });

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = {};
    if (!formulario.email.trim()) novosErros.email = 'Informe o e-mail.';
    if (!formulario.senha) novosErros.senha = 'Informe a senha.';
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await login(formulario.email, formulario.senha);
      navigate(location.state?.de ?? '/', { replace: true });
    } catch (erro) {
      setErroGeral(erro.message);
      setErros(erro.campos);
      setEnviando(false);
    }
  }

  return (
    <LayoutAutenticacao>
      <header>
        <h1>Entrar</h1>
        <p>Bem-vindo de volta! Acesse sua conta para continuar.</p>
      </header>

      {aviso && !erroGeral && (
        <div className="alerta alerta--aviso" role="status"><IconeInfo /> {aviso}</div>
      )}
      {erroGeral && (
        <div className="alerta alerta--erro" role="alert"><IconeAlerta /> {erroGeral}</div>
      )}

      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo
          id="email"
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          value={formulario.email}
          onChange={alterar('email')}
          erro={erros.email}
        />
        <Campo
          id="senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={formulario.senha}
          onChange={alterar('senha')}
          erro={erros.senha}
        />
        <button type="submit" className="botao botao--primario botao--bloco" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="auth__rodape">
        Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </LayoutAutenticacao>
  );
}
