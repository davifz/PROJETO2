import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LayoutAutenticacao from '../layout/LayoutAutenticacao.jsx';
import { Campo } from '../ui/Campo.jsx';
import { IconeAlerta } from '../ui/Icones.jsx';
import { mascaraCpf } from '../../utils/formatadores.js';
import { cpfValido, emailValido, senhaForte } from '../../utils/validacoes.js';

const VAZIO = { nome: '', email: '', cpf: '', senha: '', confirmacaoSenha: '' };

function validar(dados) {
  const erros = {};
  if (!dados.nome.trim()) erros.nome = 'Informe o nome.';
  if (!dados.email.trim()) erros.email = 'Informe o e-mail.';
  else if (!emailValido(dados.email)) erros.email = 'Informe um e-mail válido.';
  if (!dados.cpf) erros.cpf = 'Informe o CPF.';
  else if (!cpfValido(dados.cpf)) erros.cpf = 'CPF inválido.';
  if (!dados.senha) erros.senha = 'Informe a senha.';
  else if (!senhaForte(dados.senha)) erros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  if (!dados.confirmacaoSenha) erros.confirmacaoSenha = 'Confirme a senha.';
  else if (dados.confirmacaoSenha !== dados.senha) erros.confirmacaoSenha = 'As senhas não conferem.';
  return erros;
}

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [formulario, setFormulario] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (evento) => {
    const valor = campo === 'cpf' ? mascaraCpf(evento.target.value) : evento.target.value;
    setFormulario({ ...formulario, [campo]: valor });
    if (erros[campo]) setErros({ ...erros, [campo]: undefined });
  };

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = validar(formulario);
    setErros(novosErros);
    setErroGeral('');
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await cadastrar(formulario);
      navigate('/', { replace: true });
    } catch (erro) {
      // 409: o servidor diz qual campo está duplicado (email ou cpf).
      setErroGeral(erro.message);
      setErros(erro.campos);
      setEnviando(false);
    }
  }

  return (
    <LayoutAutenticacao>
      <header>
        <h1>Criar conta</h1>
        <p>Já criamos categorias e uma conta corrente para você começar.</p>
      </header>

      {erroGeral && <div className="alerta alerta--erro" role="alert"><IconeAlerta /> {erroGeral}</div>}

      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo id="nome" rotulo="Nome" autoComplete="name" value={formulario.nome} onChange={alterar('nome')} erro={erros.nome} />
        <Campo id="email" rotulo="E-mail" type="email" autoComplete="email" value={formulario.email} onChange={alterar('email')} erro={erros.email} />
        <Campo id="cpf" rotulo="CPF" inputMode="numeric" placeholder="000.000.000-00" value={formulario.cpf} onChange={alterar('cpf')} erro={erros.cpf} />
        <div className="formulario__linha">
          <Campo
            id="senha"
            rotulo="Senha"
            type="password"
            autoComplete="new-password"
            value={formulario.senha}
            onChange={alterar('senha')}
            erro={erros.senha}
            ajuda="Mínimo 8 caracteres, com letras e números."
          />
          <Campo
            id="confirmacaoSenha"
            rotulo="Confirmar senha"
            type="password"
            autoComplete="new-password"
            value={formulario.confirmacaoSenha}
            onChange={alterar('confirmacaoSenha')}
            erro={erros.confirmacaoSenha}
          />
        </div>
        <button type="submit" className="botao botao--primario botao--bloco" disabled={enviando}>
          {enviando ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="auth__rodape">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </LayoutAutenticacao>
  );
}
