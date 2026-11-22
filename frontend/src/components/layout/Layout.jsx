// Estrutura das telas autenticadas: menu lateral + conteúdo da rota (Outlet).
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Logo from '../ui/Logo.jsx';
import {
  IconeCarteira, IconeCartao, IconeCategorias, IconeFechar, IconeLancamentos,
  IconeMenu, IconePainel, IconeRelatorios, IconeSair, IconeSaude,
} from '../ui/Icones.jsx';

const LINKS = [
  { para: '/', rotulo: 'Painel', Icone: IconePainel, fim: true },
  { para: '/lancamentos', rotulo: 'Lançamentos', Icone: IconeLancamentos },
  { para: '/categorias', rotulo: 'Categorias', Icone: IconeCategorias },
  { para: '/fontes-destinos', rotulo: 'Fontes e destinos', Icone: IconeCarteira },
  { para: '/relatorios', rotulo: 'Relatórios', Icone: IconeRelatorios },
  { para: '/faturas', rotulo: 'Faturas', Icone: IconeCartao },
  { para: '/saude-financeira', rotulo: 'Saúde financeira', Icone: IconeSaude },
];

function Marca() {
  return (
    <Link to="/" className="marca">
      <Logo tamanho={40} />
      <span>
        <span className="marca__nome">Polvo<span>.</span></span>
        <span className="marca__sub">controle financeiro</span>
      </span>
    </Link>
  );
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuAberto(false), [location.pathname]); // fecha o menu ao navegar (celular)

  const iniciais = (usuario?.nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="app">
      <header className="topo-movel">
        <Marca />
        <button type="button" className="botao-icone" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
          <IconeMenu />
        </button>
      </header>

      {menuAberto && <div className="menu-fundo" onClick={() => setMenuAberto(false)} aria-hidden="true" />}

      <aside className={`menu ${menuAberto ? 'aberto' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Marca />
          {menuAberto && (
            <button type="button" className="botao-icone" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
              <IconeFechar />
            </button>
          )}
        </div>

        <nav className="menu__nav" aria-label="Navegação principal">
          {LINKS.map(({ para, rotulo, Icone, fim }) => (
            <NavLink key={para} to={para} end={fim} className={({ isActive }) => `menu__link ${isActive ? 'ativo' : ''}`}>
              <Icone />
              {rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="menu__usuario">
          <span className="avatar" aria-hidden="true">{iniciais}</span>
          <div className="menu__usuario-info">
            <strong>{usuario?.nome}</strong>
            <span>{usuario?.email}</span>
          </div>
          <button type="button" className="botao-icone" onClick={logout} aria-label="Sair" title="Sair">
            <IconeSair />
          </button>
        </div>
      </aside>

      <main className="conteudo">
        <div className="conteudo__interno">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
