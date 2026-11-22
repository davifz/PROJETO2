import { Link } from 'react-router-dom';
import Logo from '../ui/Logo.jsx';

export default function NaoEncontrada() {
  return (
    <div className="nao-encontrada">
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
        <Logo tamanho={72} />
        <h1>404</h1>
        <p className="texto-suave">Esta página se perdeu no fundo do mar.</p>
        <Link to="/" className="botao botao--primario">Voltar ao painel</Link>
      </div>
    </div>
  );
}
