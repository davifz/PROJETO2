// Pool de conexões com o PostgreSQL (pacote pg).
import pg from 'pg';
import { config } from './env.js';

// Conversões de tipo na leitura:
// NUMERIC (oid 1700) chega como string → convertemos para number. Os valores têm
// no máximo 2 casas e somas são feitas no próprio banco (SUM), então não há
// acúmulo de erro de ponto flutuante.
pg.types.setTypeParser(1700, (valor) => (valor === null ? null : Number(valor)));

// BIGINT (oid 20), usado por COUNT(*), também vira number.
pg.types.setTypeParser(20, (valor) => (valor === null ? null : Number(valor)));

// DATE (oid 1082) fica como texto 'AAAA-MM-DD' — evita problemas de fuso horário.
pg.types.setTypeParser(1082, (valor) => valor);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (erro) => {
  console.error('[db] Erro inesperado em conexão ociosa do pool:', erro.message);
});

export function query(texto, parametros) {
  return pool.query(texto, parametros);
}

export async function transacao(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}
