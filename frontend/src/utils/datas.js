// Datas no formato 'AAAA-MM-DD' (o mesmo usado pela API).
const doisDigitos = (n) => String(n).padStart(2, '0');

export function hojeISO() {
  const agora = new Date();
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

export const ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate(); // mes: 0–11

export const inicioDoMes = (iso) => `${iso.slice(0, 7)}-01`;

export function fimDoMes(iso) {
  const [ano, mes] = iso.split('-').map(Number);
  return `${iso.slice(0, 7)}-${doisDigitos(ultimoDiaDoMes(ano, mes - 1))}`;
}

export function adicionarMeses(iso, meses) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const total = ano * 12 + (mes - 1) + meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = total % 12;
  const novoDia = Math.min(dia, ultimoDiaDoMes(novoAno, novoMes));
  return `${novoAno}-${doisDigitos(novoMes + 1)}-${doisDigitos(novoDia)}`;
}

export const mesCorrente = () => {
  const hoje = hojeISO();
  return { inicio: inicioDoMes(hoje), fim: fimDoMes(hoje) };
};

export const ehMesInteiro = ({ inicio, fim }) => inicio === inicioDoMes(inicio) && fim === fimDoMes(inicio);
