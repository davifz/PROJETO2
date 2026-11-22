import rateLimit from 'express-rate-limit';

export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // cada 15 minutos
  limit: 10, // Rate limiting da rota de login: 10
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ erro: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' });
  },
});
