import Logo from '../ui/Logo.jsx';
import { IconeCheck } from '../ui/Icones.jsx';

export default function LayoutAutenticacao({ children }) {
  return (
    <div className="auth">
      <section className="auth__marca">
        <Logo tamanho={64} />
        <h1>Oito braços para <span>organizar</span> o seu dinheiro.</h1>
        <p>Registre entradas e saídas, acompanhe as faturas dos cartões e veja para onde vai cada real.</p>
        <ul className="auth__lista">
          <li><IconeCheck /> Relatórios por categoria e por conta</li>
          <li><IconeCheck /> Previsão das próximas faturas do cartão</li>
          <li><IconeCheck /> Compras parceladas com a divisão certinha dos centavos</li>
        </ul>
      </section>
      <section className="auth__form">
        <div className="auth__cartao">{children}</div>
      </section>
    </div>
  );
}
