import bcrypt from 'bcrypt';
import { pool, query } from '../src/config/db.js';
import * as Usuario from '../src/models/Usuario.js';
import * as Categoria from '../src/models/Categoria.js';
import * as FonteDestino from '../src/models/FonteDestino.js';
import * as Lancamento from '../src/models/Lancamento.js';
import { hojeISO, adicionarMeses, inicioDoMes, ultimoDiaDoMes } from '../src/models/regras/datas.js';

const SENHA_PADRAO = 'Senha123';
const hoje = hojeISO();

function criarSorteio(semente) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

function dataNoMes(deslocamento, dia) {
  const base = adicionarMeses(inicioDoMes(hoje), deslocamento);   // 'AAAA-MM-01'
  const [ano, mes] = base.split('-').map(Number);
  const diaAjustado = Math.min(dia, ultimoDiaDoMes(ano, mes - 1));
  return `${base.slice(0, 8)}${String(diaAjustado).padStart(2, '0')}`;
}

const reais = (valor) => Math.round(valor * 100);                  // → centavos

async function criarUsuario({ nome, email, cpf }) {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  const usuario = await Usuario.criarComPadroes({ nome, email, cpf, senhaHash });
  return usuario;
}

// Carrega os ids das categorias ("tipo:nome") e fontes ("nome") do usuário.
async function mapear(usuarioId) {
  const categorias = new Map(
    (await Categoria.listar(usuarioId)).map((c) => [`${c.tipo}:${c.nome}`, c.id]),
  );
  const fontes = new Map((await FonteDestino.listar(usuarioId)).map((f) => [f.nome, f.id]));
  return { categorias, fontes };
}

function criarLancador(usuarioId, mapas) {
  let quantidade = 0;
  const lancar = async ({ tipo = 'saida', descricao, valor, data, categoria, fonte, parcelas = 1 }) => {
    if (data > hoje) return;                                        // nada no futuro
    const categoriaId = mapas.categorias.get(`${tipo}:${categoria}`);
    const fonteDestinoId = mapas.fontes.get(fonte);
    if (!categoriaId || !fonteDestinoId) throw new Error(`Seed: categoria/fonte inexistente (${categoria}/${fonte})`);
    await Lancamento.criar(usuarioId, {
      tipo, descricao, valorCentavos: valor, data, categoriaId, fonteDestinoId, totalParcelas: parcelas,
    });
    quantidade += 1;
  };
  lancar.quantidade = () => quantidade;
  return lancar;
}

// USUÁRIO SEED #1: Ana Souza — 2 cartões, poupança como reserva, freelances e compras parceladas
async function seedAna() {
  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@email.com', cpf: '52998224725' });

  await Categoria.criar(ana.id, { nome: 'Rendimentos', tipo: 'entrada', grupoOrcamento: null });
  await FonteDestino.criar(ana.id, { nome: 'Freelance', tipo: 'renda', diaFechamento: null, diaVencimento: null, limiteCentavos: null, reserva: false });
  await FonteDestino.criar(ana.id, { nome: 'Poupança', tipo: 'conta', diaFechamento: null, diaVencimento: null, limiteCentavos: null, reserva: true });
  await FonteDestino.criar(ana.id, { nome: 'Nubank', tipo: 'cartao_credito', diaFechamento: 3, diaVencimento: 10, limiteCentavos: reais(5000), reserva: false });
  await FonteDestino.criar(ana.id, { nome: 'Visa Crédito', tipo: 'cartao_credito', diaFechamento: 25, diaVencimento: 5, limiteCentavos: reais(8000), reserva: false });

  const lancar = criarLancador(ana.id, await mapear(ana.id));
  const sorteio = criarSorteio(42);
  const entre = (min, max) => reais(min + sorteio() * (max - min));

  await lancar({ tipo: 'entrada', descricao: 'Saldo inicial da poupança', valor: reais(12000), data: dataNoMes(-4, 1), categoria: 'Outras receitas', fonte: 'Poupança' });

  for (const m of [-3, -2, -1, 0]) {
    const d = (dia) => dataNoMes(m, dia);
    await lancar({ tipo: 'entrada', descricao: 'Salário', valor: reais(6500), data: d(5), categoria: 'Salário', fonte: 'Salário' });
    await lancar({ tipo: 'entrada', descricao: 'Rendimento da poupança', valor: entre(60, 80), data: d(28), categoria: 'Rendimentos', fonte: 'Poupança' });
    if (m === -3 || m === -1) {
      await lancar({ tipo: 'entrada', descricao: 'Projeto freelance', valor: m === -3 ? reais(1200) : reais(1800), data: d(20), categoria: 'Outras receitas', fonte: 'Freelance' });
    }
    if (m === -2) {
      await lancar({ tipo: 'entrada', descricao: 'Venda de bicicleta usada (Pix)', valor: reais(650), data: d(16), categoria: 'Outras receitas', fonte: 'Conta corrente' });
    }
    await lancar({ descricao: 'Aluguel', valor: reais(1500), data: d(10), categoria: 'Moradia', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Condomínio', valor: reais(420), data: d(10), categoria: 'Moradia', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Energia elétrica', valor: entre(170, 230), data: d(15), categoria: 'Moradia', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Internet', valor: reais(109.9), data: d(12), categoria: 'Moradia', fonte: 'Nubank' });
    await lancar({ descricao: 'Plano de saúde', valor: reais(380), data: d(5), categoria: 'Saúde', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Curso de inglês', valor: reais(290), data: d(7), categoria: 'Educação', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Aplicação no Tesouro Direto', valor: reais(600), data: d(6), categoria: 'Investimentos', fonte: 'Conta corrente' });

    for (const dia of [4, 13, 24]) {
      await lancar({ descricao: 'Supermercado', valor: entre(240, 420), data: d(dia), categoria: 'Alimentação', fonte: 'Nubank' });
    }
    for (const dia of [8, 22]) {
      await lancar({ descricao: 'Restaurante', valor: entre(55, 120), data: d(dia), categoria: 'Alimentação', fonte: 'Visa Crédito' });
    }
    for (const dia of [3, 17, 27]) {
      await lancar({ descricao: 'Corrida de aplicativo', valor: entre(22, 45), data: d(dia), categoria: 'Mobilidade', fonte: 'Visa Crédito' });
    }
    await lancar({ descricao: 'Combustível', valor: entre(180, 240), data: d(19), categoria: 'Mobilidade', fonte: 'Nubank' });
    await lancar({ descricao: 'Farmácia', valor: entre(45, 150), data: d(11), categoria: 'Saúde', fonte: 'Nubank' });
    await lancar({ descricao: 'Streaming', valor: reais(55.9), data: d(2), categoria: 'Lazer', fonte: 'Visa Crédito' });
    await lancar({ descricao: 'Cinema', valor: entre(50, 90), data: d(14), categoria: 'Lazer', fonte: 'Visa Crédito' });
    await lancar({ descricao: 'Roupas', valor: entre(120, 300), data: d(26), categoria: 'Compras', fonte: 'Visa Crédito' });
  }

  await lancar({ descricao: 'Notebook', valor: reais(4200), data: dataNoMes(-2, 20), categoria: 'Compras', fonte: 'Visa Crédito', parcelas: 10 });
  await lancar({ descricao: 'Geladeira', valor: reais(3000), data: dataNoMes(-1, 9), categoria: 'Moradia', fonte: 'Nubank', parcelas: 6 });

  // Comprado no dia do fechamento do Nubank (dia 3) → entra na fatura do mês seguinte.
  await lancar({ descricao: 'Fone de ouvido', valor: reais(100), data: dataNoMes(0, 3), categoria: 'Compras', fonte: 'Nubank', parcelas: 3 });

  // Gasto fora da curva no mês atual (aparece na página de saúde financeira).
  await lancar({ descricao: 'Show', valor: reais(480), data: dataNoMes(0, 1), categoria: 'Lazer', fonte: 'Visa Crédito' });

  return { usuario: ana, lancamentos: lancar.quantidade() };
}

// USUÁRIO SEED #2: Bruno Lima — 1 cartão, orçamento mais apertado
async function seedBruno() {
  const bruno = await criarUsuario({ nome: 'Bruno Lima', email: 'bruno@email.com', cpf: '11144477735' });
  await FonteDestino.criar(bruno.id, { nome: 'Cartão Inter', tipo: 'cartao_credito', diaFechamento: 10, diaVencimento: 17, limiteCentavos: reais(3000), reserva: false });

  const lancar = criarLancador(bruno.id, await mapear(bruno.id));
  const sorteio = criarSorteio(7);
  const entre = (min, max) => reais(min + sorteio() * (max - min));

  for (const m of [-3, -2, -1, 0]) {
    const d = (dia) => dataNoMes(m, dia);
    await lancar({ tipo: 'entrada', descricao: 'Salário', valor: reais(4200), data: d(5), categoria: 'Salário', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Aluguel', valor: reais(1300), data: d(8), categoria: 'Moradia', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Mensalidade da faculdade', valor: reais(650), data: d(10), categoria: 'Educação', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Transporte público', valor: reais(180), data: d(2), categoria: 'Mobilidade', fonte: 'Conta corrente' });
    await lancar({ descricao: 'Conta de celular', valor: reais(59.9), data: d(15), categoria: 'Moradia', fonte: 'Cartão Inter' });
    for (const dia of [6, 20]) {
      await lancar({ descricao: 'Mercado', valor: entre(280, 400), data: d(dia), categoria: 'Alimentação', fonte: 'Cartão Inter' });
    }
    await lancar({ descricao: 'Lanche', valor: entre(25, 60), data: d(12), categoria: 'Alimentação', fonte: 'Carteira' });
    await lancar({ descricao: 'Bar com amigos', valor: entre(80, 180), data: d(23), categoria: 'Lazer', fonte: 'Cartão Inter' });
    await lancar({ descricao: 'Academia', valor: reais(99.9), data: d(4), categoria: 'Saúde', fonte: 'Cartão Inter' });
  }
  await lancar({ descricao: 'Celular novo', valor: reais(2400), data: dataNoMes(-2, 12), categoria: 'Compras', fonte: 'Cartão Inter', parcelas: 12 });

  return { usuario: bruno, lancamentos: lancar.quantidade() };
}

try {
  console.log(`Gerando dados de demonstração (hoje = ${hoje})...`);
  await query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
  const resultados = [await seedAna(), await seedBruno()];
  console.log('Seed concluído. Usuários (senha de todos: %s):', SENHA_PADRAO);
  for (const { usuario, lancamentos } of resultados) {
    console.log(`  - ${usuario.nome} <${usuario.email}> — ${lancamentos} lançamentos (sem contar parcelas extras)`);
  }
} catch (erro) {
  console.error('Falha no seed:', erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
