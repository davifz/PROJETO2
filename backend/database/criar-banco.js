// Cria o banco de dados (se ainda não existir) e executa database/schema.sql.
// npm run db:criar
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida. Copie .env.example para .env e preencha.');
  process.exit(1);
}

const nomeBanco = decodeURIComponent(new URL(url).pathname.slice(1));

async function criarBancoSeNecessario() {
  const urlAdmin = new URL(url);
  urlAdmin.pathname = '/postgres';
  const cliente = new pg.Client({ connectionString: urlAdmin.toString() });
  try {
    await cliente.connect();
    const { rowCount } = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
    if (rowCount === 0) {
      // Nome de banco não aceita parâmetro ($1); por isso é escapado com aspas duplas.
      await cliente.query(`CREATE DATABASE "${nomeBanco.replace(/"/g, '""')}"`);
      console.log(`✔ Banco "${nomeBanco}" criado.`);
    } else {
      console.log(`✔ Banco "${nomeBanco}" já existe.`);
    }
  } catch (erro) {
    console.warn(`! Não foi possível verificar/criar o banco automaticamente (${erro.message}).`);
    console.warn(`  Se ele ainda não existir, crie manualmente: createdb ${nomeBanco}`);
  } finally {
    await cliente.end().catch(() => {});
  }
}

async function executarSchema() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query(sql);
    console.log('✔ Tabelas criadas (database/schema.sql).');
  } finally {
    await cliente.end();
  }
}

try {
  await criarBancoSeNecessario();
  await executarSchema();
} catch (erro) {
  console.error('Falha ao criar o banco:', erro.message);
  process.exit(1);
}
