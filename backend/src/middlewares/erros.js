export class ErroHttp extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

const UNICIDADE = {
  usuarios_email_unico: {
    erro: 'Usuário já cadastrado.', campo: 'email', mensagem: 'Já existe um usuário com este e-mail.',
  },
  usuarios_cpf_unico: {
    erro: 'Usuário já cadastrado.', campo: 'cpf', mensagem: 'Já existe um usuário com este CPF.',
  },
  categorias_nome_unico: {
    erro: 'Categoria duplicada.', campo: 'nome', mensagem: 'Você já tem uma categoria com este nome e tipo.',
  },
  fontes_destinos_nome_unico: {
    erro: 'Fonte/destino duplicado.', campo: 'nome', mensagem: 'Você já tem uma fonte/destino com este nome.',
  },
};
UNICIDADE.categorias_nome_unico_ci = UNICIDADE.categorias_nome_unico;
UNICIDADE.fontes_destinos_nome_unico_ci = UNICIDADE.fontes_destinos_nome_unico;

const corpoDeErro = (erro, campos) => (campos && Object.keys(campos).length ? { erro, campos } : { erro });

export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  if (res.headersSent) return next(erro);

  if (erro instanceof ErroHttp) {
    return res.status(erro.status).json(corpoDeErro(erro.message, erro.campos));
  }

  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
  }
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'O corpo da requisição é grande demais.' });
  }

  switch (erro.code) {
    case '23505': { // unique_violation
      const info = UNICIDADE[erro.constraint];
      if (info) return res.status(409).json(corpoDeErro(info.erro, { [info.campo]: info.mensagem }));
      return res.status(409).json({ erro: 'Registro duplicado.' });
    }
    case '23503': // foreign_key_violation
      return res.status(409).json({
        erro: 'Operação não permitida: o registro está relacionado a outros dados.',
      });
    case '23502': // not_null_violation
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return res.status(400).json({ erro: 'Dados inválidos.' });
    default:
      break;
  }

  console.error('[erro]', erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}
