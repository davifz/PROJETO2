// Rotas de autenticação: cadastro, login e dados do usuário logado.
// (Os controladores ficam no próprio arquivo de rotas, como pede o enunciado.)
import { Router } from 'express';
import bcrypt from 'bcrypt';
import * as Usuario from '../models/Usuario.js';
import { autenticar, gerarToken } from '../middlewares/autenticar.js';
import { limitarLogin } from '../middlewares/limitarLogin.js';
import { validarCadastro, validarLogin } from '../middlewares/validacoes.js';
import { ErroHttp } from '../middlewares/erros.js';

const router = Router();
const CUSTO_BCRYPT = 10;

// Quando o e-mail não existe, comparamos a senha com este hash "falso" para que
// a resposta demore o mesmo tempo — assim o tempo de resposta também não revela
// se o e-mail está cadastrado.
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe-123', CUSTO_BCRYPT);

// POST /api/auth/cadastro → 201 | 400 | 409
router.post('/cadastro', validarCadastro, async (req, res) => {
  const { nome, email, cpf, senha } = req.dados;          // já normalizados (e-mail minúsculo, CPF só dígitos)
  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT); // bcrypt gera e embute o salt no hash

  // Não há consulta prévia "existe esse e-mail?": quem garante a unicidade é o
  // UNIQUE do banco. Se duplicar, o PostgreSQL lança o erro 23505 e o middleware
  // de erros (middlewares/erros.js) responde 409 indicando o campo duplicado.
  const usuario = await Usuario.criarComPadroes({ nome, email, cpf, senhaHash });
  res.status(201).json(usuario);                           // sem senha_hash
});

// POST /api/auth/login → 200 | 400 | 401 | 429
router.post('/login', limitarLogin, validarLogin, async (req, res) => {
  const { email, senha } = req.dados;
  const usuario = await Usuario.buscarParaLogin(email);
  const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);

  if (!usuario || !senhaConfere) {
    // Mensagem genérica: não revela se o e-mail existe.
    throw new ErroHttp(401, 'E-mail ou senha inválidos.');
  }

  res.json({
    token: gerarToken(usuario.id),
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

// GET /api/auth/me → 200 | 401
router.get('/me', autenticar, async (req, res) => {
  const usuario = await Usuario.buscarPorId(req.usuarioId);
  if (!usuario) throw new ErroHttp(401, 'Usuário não encontrado.');
  res.json(usuario);
});

export default router;
