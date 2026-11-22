// CRUD de categorias (RF4). Todas as rotas exigem token.
import { Router } from 'express';
import * as Categoria from '../models/Categoria.js';
import { autenticar } from '../middlewares/autenticar.js';
import { ErroHttp } from '../middlewares/erros.js';
import { validarCategoria, idDaUrl, inteiroPositivo, TIPOS_LANCAMENTO } from '../middlewares/validacoes.js';

const router = Router();
router.use(autenticar);

async function buscarOu404(usuarioId, id) {
  const categoria = await Categoria.buscarPorId(usuarioId, id);
  if (!categoria) throw new ErroHttp(404, 'Categoria não encontrada.');
  return categoria;
}

// GET /api/categorias?tipo=saida
router.get('/', async (req, res) => {
  const tipo = TIPOS_LANCAMENTO.includes(req.query.tipo) ? req.query.tipo : null;
  res.json(await Categoria.listar(req.usuarioId, tipo));
});

// GET /api/categorias/:id
router.get('/:id', async (req, res) => {
  res.json(await buscarOu404(req.usuarioId, idDaUrl(req)));
});

// POST /api/categorias → 201 | 400 | 409 (nome repetido para o mesmo tipo)
router.post('/', validarCategoria, async (req, res) => {
  res.status(201).json(await Categoria.criar(req.usuarioId, req.dados));
});

// PUT /api/categorias/:id → 200 | 400 | 404 | 409
router.put('/:id', validarCategoria, async (req, res) => {
  const id = idDaUrl(req);
  const atual = await buscarOu404(req.usuarioId, id);

  // Mudar o tipo deixaria lançamentos com categoria de tipo diferente.
  if (atual.tipo !== req.dados.tipo && atual.totalLancamentos > 0) {
    throw new ErroHttp(409, 'Não é possível mudar o tipo desta categoria.', {
      tipo: `A categoria tem ${atual.totalLancamentos} lançamento(s); o tipo não pode ser alterado.`,
    });
  }
  res.json(await Categoria.atualizar(req.usuarioId, id, req.dados));
});

// DELETE /api/categorias/:id[?moverPara=ID] → 204 | 400 | 404 | 409
router.delete('/:id', async (req, res) => {
  const id = idDaUrl(req);
  const atual = await buscarOu404(req.usuarioId, id);

  if (atual.totalLancamentos === 0) {
    await Categoria.excluir(req.usuarioId, id);
    return res.status(204).end();
  }

  // Tem lançamentos: recusa (409), a menos que o usuário escolha para onde movê-los.
  if (req.query.moverPara === undefined) {
    throw new ErroHttp(
      409,
      `A categoria "${atual.nome}" tem ${atual.totalLancamentos} lançamento(s) e não pode ser excluída. `
      + 'Mova os lançamentos para outra categoria antes de excluí-la.',
    );
  }

  const destinoId = inteiroPositivo(req.query.moverPara);
  const destino = destinoId && destinoId !== id ? await Categoria.buscarPorId(req.usuarioId, destinoId) : null;
  if (!destino) {
    throw new ErroHttp(400, 'Dados inválidos.', { moverPara: 'Escolha outra categoria sua para receber os lançamentos.' });
  }
  if (destino.tipo !== atual.tipo) {
    throw new ErroHttp(400, 'Dados inválidos.', { moverPara: 'A categoria de destino deve ser do mesmo tipo.' });
  }

  await Categoria.moverLancamentosEExcluir(req.usuarioId, id, destino.id);
  return res.status(204).end();
});

export default router;
