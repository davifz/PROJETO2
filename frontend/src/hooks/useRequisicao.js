import { useCallback, useEffect, useState } from 'react';

export function useRequisicao(funcao, dependencias = []) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));
    funcao()
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => ativo && setEstado({ dados: null, carregando: false, erro }));
    return () => {
      ativo = false;
    };

  }, [...dependencias, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, recarregar };
}
