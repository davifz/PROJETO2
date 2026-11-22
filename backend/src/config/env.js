import 'dotenv/config';

const obrigatorias = ['DATABASE_URL', 'JWT_SECRET'];
for (const nome of obrigatorias) {
  if (!process.env[nome]) {
    console.error(`[config] Variável de ambiente ${nome} não definida. Copie .env.example para .env e preencha.`);
    process.exit(1);
  }
}

export const config = {
  porta: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiraEm: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigens: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean),
};
