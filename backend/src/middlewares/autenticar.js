import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não informado.' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) throw new Error('sub inválido');
    req.usuarioId = id;                                 // id do dono do token
    return next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

export function gerarToken(usuarioId) {
  return jwt.sign({}, config.jwtSecret, {
    algorithm: 'HS256',
    subject: String(usuarioId),
    expiresIn: config.jwtExpiraEm,
  });
}
