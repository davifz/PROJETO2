import { Router } from 'express';
import * as Lancamento from '../models/Lancamento.js';
import * as Categoria from '../models/Categoria.js';
import * as FonteDestino from '../models/FonteDestino.js';
import { autenticar } from '../middlewares/autenticar.js';
import { ErroHttp } from '../middlewares/erros.js';
import { validarLancamento, validarFiltrosLancamentos, idDaUrl } from '../middlewares/validacoes.js';

const router = Router();
router.use(autenticar);

const rotuloTipo = (tipo) => (tipo === 'saida' ? 'saída' : 'entrada');

async function buscarOu404(usuarioId, id) {
  const lancamento = await Lancamento.buscarPorId(usuarioId, id);
  if (!lancamento) throw new ErroHttp(404, 'Lançamento não encontrado.');
  return lancamento;
}

async function conferirRegrasDeNegocio(usuarioId, dados) {
  const [categoria, fonte] = await Promise.all([
    Categoria.buscarPorId(usuarioId, dados.categoriaId),
    FonteDestino.buscarPorId(usuarioId, dados.fonteDestinoId),
  ]);

  const campos = {};
  let status = 400;

  if (!categoria) {
    campos.categoriaId = 'Categoria não encontrada.';
    status = 404;
  } else if (categoria.tipo !== dados.tipo) {
    campos.categoriaId = `A categoria informada é de ${rotuloTipo(categoria.tipo)}, `
      + `mas o lançamento é de ${rotuloTipo(dados.tipo)}.`;
  }

  if (!fonte) {
    campos.fonteDestinoId = 'Fonte/destino não encontrado.';
    status = 404;
  } else {
    if (fonte.tipo === 'renda' && dados.tipo === 'saida') {
      campos.fonteDestinoId = 'Uma fonte de renda só pode receber lançamentos de entrada.';
    }
    if (dados.totalParcelas > 1 && (fonte.tipo !== 'cartao_credito' || dados.tipo !== 'saida')) {
      campos.totalParcelas = 'Só é possível parcelar saídas no cartão de crédito.';
    }
  }

  if (Object.keys(campos).length > 0) {
    throw new ErroHttp(status, status === 404 ? 'Registro relacionado não encontrado.' : 'Dados inválidos.', campos);
  }
}

// GET /api/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=&porPagina=
router.get('/', validarFiltrosLancamentos, async (req, res) => {
  res.json(await Lancamento.listar(req.usuarioId, req.filtros));
});

// GET /api/lancamentos/:id
router.get('/:id', async (req, res) => {
  res.json(await buscarOu404(req.usuarioId, idDaUrl(req)));
});

// POST /api/lancamentos
router.post('/', validarLancamento, async (req, res) => {
  await conferirRegrasDeNegocio(req.usuarioId, req.dados);
  res.status(201).json(await Lancamento.criar(req.usuarioId, req.dados));
});

// PUT /api/lancamentos/:id
router.put('/:id', validarLancamento, async (req, res) => {
  const existente = await buscarOu404(req.usuarioId, idDaUrl(req));
  const dados = { ...req.dados, totalParcelas: existente.totalParcelas };
  await conferirRegrasDeNegocio(req.usuarioId, dados);
  res.json(await Lancamento.atualizar(req.usuarioId, existente, dados));
});

// DELETE /api/lancamentos/:id[?todasParcelas=true]
router.delete('/:id', async (req, res) => {
  const existente = await buscarOu404(req.usuarioId, idDaUrl(req));
  await Lancamento.excluir(req.usuarioId, existente, req.query.todasParcelas === 'true');
  res.status(204).end();
});

export default router;
