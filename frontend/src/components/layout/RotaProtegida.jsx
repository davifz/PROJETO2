// Rotas protegidas: sem login, o usuário é redirecionado para /login.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export function RotaProtegida({ children }) {
  const { autenticado } = useAuth();
  const location = useLocation();
  if (!autenticado) {
    // Guarda de onde o usuário veio para voltar depois do login.
    return <Navigate to="/login" replace state={{ de: location.pathname, ...location.state }} />;
  }
  return children;
}

export function RotaPublica({ children }) {
  const { autenticado } = useAuth();
  if (autenticado) return <Navigate to="/" replace />;
  return children;
}
