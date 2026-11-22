// Ponto de entrada da API: cria o app Express, registra middlewares e rotas.
import { config } from './config/env.js';      // primeiro: carrega o .env
import express from 'express';
import cors from 'cors';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import fontesDestinosRoutes from './routes/fontesDestinos.routes.js';
import lancamentosRoutes from './routes/lancamentos.routes.js';
import relatoriosRoutes from './routes/relatorios.routes.js';
import saudeFinanceiraRoutes from './routes/saudeFinanceira.routes.js';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigens }));      // só o front-end pode chamar a API
app.use(express.json({ limit: '100kb' }));

// Verificação rápida de que a API e o banco estão no ar.
app.get('/api/status', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

// Públicas: cadastro e login. As demais exigem token (router.use(autenticar) em cada arquivo).
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/fontes-destinos', fontesDestinosRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/saude-financeira', saudeFinanceiraRoutes);

app.use(rotaNaoEncontrada);   // nenhuma rota respondeu → 404 no padrão de erro
app.use(tratarErros);         // tratamento de erros centralizado

app.listen(config.porta, () => {
  console.log(`API rodando em http://localhost:${config.porta}/api`);
});
