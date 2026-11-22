// Pool de conexões com o PostgreSQL (pacote pg).
import pg from 'pg';
import { config } from './env.js';

pg.types.setTypeParser(1700, (valor) => (valor === null ? null : Number(valor)));

pg.types.setTypeParser(20, (valor) => (valor === null ? null : Number(valor)));

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
