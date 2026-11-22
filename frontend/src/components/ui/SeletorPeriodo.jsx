// Escolha do período: navegação mês a mês ou intervalo personalizado.
import { useState } from 'react';
import { IconeAnterior, IconeProximo } from './Icones.jsx';
import { adicionarMeses, ehMesInteiro, fimDoMes, inicioDoMes } from '../../utils/datas.js';
import { capitalizar, mesAno } from '../../utils/formatadores.js';

export default function SeletorPeriodo({ periodo, aoMudar, permitirPersonalizado = true }) {
  const [personalizado, setPersonalizado] = useState(!ehMesInteiro(periodo));

  const mudarMes = (deslocamento) => {
    const base = adicionarMeses(inicioDoMes(periodo.inicio), deslocamento);
    aoMudar({ inicio: base, fim: fimDoMes(base) });
  };

  const alternar = () => {
    if (personalizado) aoMudar({ inicio: inicioDoMes(periodo.inicio), fim: fimDoMes(periodo.inicio) });
    setPersonalizado(!personalizado);
  };

  return (
    <div className="seletor-periodo">
      {personalizado ? (
        <div className="seletor-datas">
          <input
            type="date"
            aria-label="Data inicial"
            value={periodo.inicio}
            max={periodo.fim}
            onChange={(e) => e.target.value && aoMudar({ ...periodo, inicio: e.target.value })}
          />
          <span className="texto-fraco">até</span>
          <input
            type="date"
            aria-label="Data final"
            value={periodo.fim}
            min={periodo.inicio}
            onChange={(e) => e.target.value && aoMudar({ ...periodo, fim: e.target.value })}
          />
        </div>
      ) : (
        <div className="seletor-mes">
          <button type="button" className="botao-icone" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            <IconeAnterior />
          </button>
          <span aria-live="polite">{capitalizar(mesAno(periodo.inicio.slice(0, 7)))}</span>
          <button type="button" className="botao-icone" onClick={() => mudarMes(1)} aria-label="Próximo mês">
            <IconeProximo />
          </button>
        </div>
      )}
      {permitirPersonalizado && (
        <button type="button" className="botao-link" onClick={alternar}>
          {personalizado ? 'Ver por mês' : 'Personalizar período'}
        </button>
      )}
    </div>
  );
}
