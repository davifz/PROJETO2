// Relatórios: por categoria (RF7), por fonte/destino (RF8) e faturas (RF9).
import { Router } from 'express';
import * as Relatorio from '../models/Relatorio.js';
import * as Fatura from '../models/Fatura.js';
import { autenticar } from '../middlewares/autenticar.js';
import { ErroHttp } from '../middlewares/erros.js';
import { validarPeriodo, inteiroPositivo } from '../middlewares/validacoes.js';

const router = Router();
router.use(autenticar);

// GET /api/relatorios/categorias?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/categorias', validarPeriodo, async (req, res) => {
  const { inicio, fim } = req.filtros;
  res.json(await Relatorio.porCategoria(req.usuarioId, inicio, fim));
});

// GET /api/relatorios/fontes-destinos?inicio=&fim=
router.get('/fontes-destinos', validarPeriodo, async (req, res) => {
  const { inicio, fim } = req.filtros;
  res.json(await Relatorio.porFonteDestino(req.usuarioId, inicio, fim));
});

// GET /api/relatorios/faturas?meses=3 (fatura aberta + as próximas N)
router.get('/faturas', async (req, res) => {
  const meses = req.query.meses === undefined ? 3 : inteiroPositivo(req.query.meses);
  if (!meses || meses > 24) {
    throw new ErroHttp(400, 'Dados inválidos.', { meses: 'Informe de 1 a 24 meses.' });
  }
  res.json(await Fatura.previsao(req.usuarioId, meses));
});

export default router;
