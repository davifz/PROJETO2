import { Router } from 'express';
import bcrypt from 'bcrypt';
import * as Usuario from '../models/Usuario.js';
import { autenticar, gerarToken } from '../middlewares/autenticar.js';
import { limitarLogin } from '../middlewares/limitarLogin.js';
import { validarCadastro, validarLogin } from '../middlewares/validacoes.js';
import { ErroHttp } from '../middlewares/erros.js';

const router = Router();
const CUSTO_BCRYPT = 10;

const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe-123', CUSTO_BCRYPT);

// POST /api/auth/cadastro
router.post('/cadastro', validarCadastro, async (req, res) => {
  const { nome, email, cpf, senha } = req.dados;          
  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);

  const usuario = await Usuario.criarComPadroes({ nome, email, cpf, senhaHash });
  res.status(201).json(usuario);                           
});

// POST /api/auth/login
router.post('/login', limitarLogin, validarLogin, async (req, res) => {
  const { email, senha } = req.dados;
  const usuario = await Usuario.buscarParaLogin(email);
  const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);

  if (!usuario || !senhaConfere) {
    throw new ErroHttp(401, 'E-mail ou senha inválidos.');
  }

  res.json({
    token: gerarToken(usuario.id),
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

// GET /api/auth/me
router.get('/me', autenticar, async (req, res) => {
  const usuario = await Usuario.buscarPorId(req.usuarioId);
  if (!usuario) throw new ErroHttp(401, 'Usuário não encontrado.');
  res.json(usuario);
});

export default router;
