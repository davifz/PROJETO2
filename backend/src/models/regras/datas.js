// datas no formato 'AAAA-MM-DD'.

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const doisDigitos = (n) => String(n).padStart(2, '0');

export function ultimoDiaDoMes(ano, mes) {          // mes: 0 a 11
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

// Aceita mes > 11 ou < 0 e ajusta dia 31 em meses curtos (31/02 → 28 ou 29/02).
export function dataSegura(ano, mes, dia) {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

export const paraISO = (data) => data.toISOString().slice(0, 10);

export function deISO(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function dataValida(texto) {
  if (typeof texto !== 'string') return false;
  const partes = RE_DATA.exec(texto);
  if (!partes) return false;
  const [ano, mes, dia] = partes.slice(1).map(Number);
  if (ano < 1900 || ano > 2200) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function hojeISO(agora = new Date()) {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

export function adicionarDias(iso, dias) {
  const data = deISO(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return paraISO(data);
}

export function adicionarMeses(iso, meses) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return paraISO(dataSegura(ano, mes - 1 + meses, dia));
}

export const inicioDoMes = (iso) => `${iso.slice(0, 7)}-01`;

export function fimDoMes(iso) {
  const [ano, mes] = iso.split('-').map(Number);
  return `${iso.slice(0, 7)}-${doisDigitos(ultimoDiaDoMes(ano, mes - 1))}`;
}

export const mesDe = (iso) => iso.slice(0, 7);          // 'AAAA-MM'

export function diasNoPeriodo(inicio, fim) {
  return Math.round((deISO(fim) - deISO(inicio)) / 86_400_000) + 1;
}

export function periodoAnterior(inicio, fim) {
  const mesesInteiros = inicio === inicioDoMes(inicio) && fim === fimDoMes(fim);
  if (mesesInteiros) {
    const [ai, mi] = inicio.split('-').map(Number);
    const [af, mf] = fim.split('-').map(Number);
    const quantidadeMeses = (af * 12 + mf) - (ai * 12 + mi) + 1;
    return { inicio: adicionarMeses(inicio, -quantidadeMeses), fim: adicionarDias(inicio, -1) };
  }
  const dias = diasNoPeriodo(inicio, fim);
  const fimAnterior = adicionarDias(inicio, -1);
  return { inicio: adicionarDias(fimAnterior, -(dias - 1)), fim: fimAnterior };
}
