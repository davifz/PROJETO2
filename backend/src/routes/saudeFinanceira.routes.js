// Desafio: página de saúde financeira. Os cálculos ficam em models/SaudeFinanceira.js.
import { Router } from 'express';
import * as SaudeFinanceira from '../models/SaudeFinanceira.js';
import { autenticar } from '../middlewares/autenticar.js';

const router = Router();
router.use(autenticar);

// GET /api/saude-financeira
router.get('/', async (req, res) => {
  res.json(await SaudeFinanceira.analisar(req.usuarioId));
});

export default router;
