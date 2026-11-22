// Acesso à tabela usuarios.
import { query, transacao } from '../config/db.js';
import { criarCategoriasPadrao } from './Categoria.js';
import { criarFontesDestinosPadrao } from './FonteDestino.js';

const CAMPOS_PUBLICOS = 'id, nome, email, criado_em AS "criadoEm"';

// Não permite criação de usuários com o mesmo CPF. 
export async function criarComPadroes({ nome, email, cpf, senhaHash }) {
  return transacao(async (cliente) => {
    const { rows } = await cliente.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING ${CAMPOS_PUBLICOS}`,
      [nome, email, cpf, senhaHash],
    );
    const usuario = rows[0];
    await criarCategoriasPadrao(usuario.id, cliente);
    await criarFontesDestinosPadrao(usuario.id, cliente);
    return usuario;
  });
}

// Única consulta que lê o hash, é usada apenas para conferir a senha no login.
export async function buscarParaLogin(email) {
  const { rows } = await query(
    'SELECT id, nome, email, senha_hash AS "senhaHash" FROM usuarios WHERE email = $1',
    [email],
  );
  return rows[0] ?? null;
}

export async function buscarPorId(id) {
  const { rows } = await query(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
