// CRUD de fontes/destinos (RF5). Todas as rotas exigem token.
import { Router } from 'express';
import * as FonteDestino from '../models/FonteDestino.js';
import { autenticar } from '../middlewares/autenticar.js';
import { ErroHttp } from '../middlewares/erros.js';
import { validarFonteDestino, idDaUrl } from '../middlewares/validacoes.js';

const router = Router();
router.use(autenticar);

async function buscarOu404(usuarioId, id) {
  const fonte = await FonteDestino.buscarPorId(usuarioId, id);
  if (!fonte) throw new ErroHttp(404, 'Fonte/destino não encontrado.');
  return fonte;
}

// GET /api/fontes-destinos
router.get('/', async (req, res) => {
  res.json(await FonteDestino.listar(req.usuarioId));
});

// GET /api/fontes-destinos/:id
router.get('/:id', async (req, res) => {
  res.json(await buscarOu404(req.usuarioId, idDaUrl(req)));
});

// POST /api/fontes-destinos → 201 | 400 (cartão sem fechamento/vencimento/limite) | 409
router.post('/', validarFonteDestino, async (req, res) => {
  res.status(201).json(await FonteDestino.criar(req.usuarioId, req.dados));
});

// PUT /api/fontes-destinos/:id → 200 | 400 | 404 | 409
router.put('/:id', validarFonteDestino, async (req, res) => {
  const id = idDaUrl(req);
  const atual = await buscarOu404(req.usuarioId, id);

  // Mudar o tipo (ex.: cartão → conta) quebraria parcelamentos e faturas existentes.
  if (atual.tipo !== req.dados.tipo && atual.totalLancamentos > 0) {
    throw new ErroHttp(409, 'Não é possível mudar o tipo desta fonte/destino.', {
      tipo: `Há ${atual.totalLancamentos} lançamento(s) vinculados; o tipo não pode ser alterado.`,
    });
  }
  res.json(await FonteDestino.atualizar(req.usuarioId, id, req.dados));
});

// DELETE /api/fontes-destinos/:id → 204 | 404 | 409 (há lançamentos vinculados)
router.delete('/:id', async (req, res) => {
  const id = idDaUrl(req);
  const atual = await buscarOu404(req.usuarioId, id);

  if (atual.totalLancamentos > 0) {
    throw new ErroHttp(
      409,
      `"${atual.nome}" tem ${atual.totalLancamentos} lançamento(s) vinculados e não pode ser excluída. `
      + 'Exclua ou altere esses lançamentos antes.',
    );
  }
  await FonteDestino.excluir(req.usuarioId, id);
  res.status(204).end();
});

export default router;
