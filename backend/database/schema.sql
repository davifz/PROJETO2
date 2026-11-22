-- Esquema do banco (PostgreSQL 13+)

-- `npm run db:criar` (database/criar-banco.js).

DROP TABLE IF EXISTS lancamentos     CASCADE;
DROP TABLE IF EXISTS fontes_destinos CASCADE;
DROP TABLE IF EXISTS categorias      CASCADE;
DROP TABLE IF EXISTS usuarios        CASCADE;

CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL CHECK (length(trim(nome)) > 0),
  email       VARCHAR(160) NOT NULL,                 
  cpf         CHAR(11)     NOT NULL,                 
  senha_hash  VARCHAR(100) NOT NULL,                 
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT usuarios_email_unico UNIQUE (email),
  CONSTRAINT usuarios_cpf_unico   UNIQUE (cpf),

  CONSTRAINT usuarios_email_normalizado CHECK (email = lower(trim(email))),
  CONSTRAINT usuarios_cpf_digitos       CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE categorias (
  id               SERIAL PRIMARY KEY,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome             VARCHAR(60) NOT NULL CHECK (length(trim(nome)) > 0),
  tipo             VARCHAR(7)  NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  grupo_orcamento  VARCHAR(11) CHECK (grupo_orcamento IN ('necessidade', 'desejo', 'poupanca')),

  CONSTRAINT categorias_nome_unico UNIQUE (usuario_id, nome, tipo),
  CONSTRAINT categorias_id_usuario_tipo_unico UNIQUE (id, usuario_id, tipo),
  CONSTRAINT categorias_grupo_so_saida CHECK (grupo_orcamento IS NULL OR tipo = 'saida')
);

CREATE UNIQUE INDEX categorias_nome_unico_ci ON categorias (usuario_id, lower(nome), tipo);

CREATE TABLE fontes_destinos (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome            VARCHAR(60) NOT NULL CHECK (length(trim(nome)) > 0),
  tipo            VARCHAR(14) NOT NULL CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  dia_fechamento  SMALLINT CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento  SMALLINT CHECK (dia_vencimento BETWEEN 1 AND 31),
  limite          NUMERIC(12, 2) CHECK (limite >= 0),
  reserva         BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT fontes_destinos_nome_unico UNIQUE (usuario_id, nome),
  CONSTRAINT fontes_destinos_id_usuario_unico UNIQUE (id, usuario_id),
  CONSTRAINT fontes_destinos_dados_cartao CHECK (
    tipo <> 'cartao_credito'
    OR (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite IS NOT NULL)
  ),
  CONSTRAINT fontes_destinos_reserva_so_conta CHECK (reserva = FALSE OR tipo = 'conta')
);

CREATE UNIQUE INDEX fontes_destinos_nome_unico_ci ON fontes_destinos (usuario_id, lower(nome));

CREATE TABLE lancamentos (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo                VARCHAR(7)     NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao           VARCHAR(120)   NOT NULL CHECK (length(trim(descricao)) > 0),
  valor               NUMERIC(12, 2) NOT NULL CHECK (valor > 0),   
  data                DATE           NOT NULL,                     
  categoria_id        INTEGER NOT NULL REFERENCES categorias(id),
  fonte_destino_id    INTEGER NOT NULL REFERENCES fontes_destinos(id),
  parcela_atual       SMALLINT NOT NULL DEFAULT 1,
  total_parcelas      SMALLINT NOT NULL DEFAULT 1 CHECK (total_parcelas BETWEEN 1 AND 48),
  grupo_parcelamento  UUID,                                        
  criado_em           TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT lancamentos_parcela_valida CHECK (parcela_atual BETWEEN 1 AND total_parcelas),
  CONSTRAINT lancamentos_grupo_parcelas CHECK ((total_parcelas = 1) = (grupo_parcelamento IS NULL)),

  CONSTRAINT lancamentos_categoria_do_usuario
    FOREIGN KEY (categoria_id, usuario_id, tipo) REFERENCES categorias (id, usuario_id, tipo),
  CONSTRAINT lancamentos_fonte_do_usuario
    FOREIGN KEY (fonte_destino_id, usuario_id) REFERENCES fontes_destinos (id, usuario_id)
);

CREATE INDEX idx_lancamentos_usuario_data ON lancamentos (usuario_id, data);
CREATE INDEX idx_lancamentos_categoria    ON lancamentos (categoria_id);
CREATE INDEX idx_lancamentos_fonte        ON lancamentos (fonte_destino_id);
CREATE INDEX idx_lancamentos_grupo        ON lancamentos (grupo_parcelamento)
  WHERE grupo_parcelamento IS NOT NULL;
