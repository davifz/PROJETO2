// Executa uma chamada à API e controla os estados de carregamento, erro e dados.
// Uso: const { dados, carregando, erro, recarregar } = useRequisicao(() => api.algo(x), [x]);
import { useCallback, useEffect, useState } from 'react';

export function useRequisicao(funcao, dependencias = []) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true; // ignora respostas que chegam depois de o componente mudar
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));
    funcao()
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => ativo && setEstado({ dados: null, carregando: false, erro }));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, recarregar };
}
