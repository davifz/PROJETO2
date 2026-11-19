# Polvo - Controle Financeiro Pessoal

Aplicação full stack de controle financeiro: **API REST em Node.js/Express + PostgreSQL** e **SPA em React (Vite)**.
O usuário se cadastra, faz login (JWT) e registra entradas e saídas, com categorias, fontes/destinos, compras
parceladas no cartão, relatórios, previsão de faturas e uma página de saúde financeira (desafio).

O projeto foi desenvolvido como parte da disciplina de Programação Web Fullstack.

---

## Alunos
>[Davi Felipe Zeneratto](https://github.com/davifz) RA: 2576180
>
>[Vinícius de Farias Santos](https://github.com/lodestaarz) RA: 2576341

---

## Tecnologias

| Camada | Tecnologia | Para quê |
|---|---|---|
| Banco | **PostgreSQL** 13+ | Persistência, `UNIQUE`, `CHECK`, chaves estrangeiras |
| Back-end | **Node.js** 18.18+ (recomendado 20 LTS) + **Express 5** | API REST |
| | `pg` | Driver do PostgreSQL com **pool de conexões** |
| | `bcrypt` | Hash + salt das senhas |
| | `jsonwebtoken` | Token JWT (expira em 1 h) |
| | `dotenv` | Variáveis de ambiente (`.env`) |
| | `cors` | CORS restrito à origem do front-end |
| | `express-rate-limit` | Rate limiting na rota de login |
| Front-end | **React 18** + **Vite** | SPA |
| | `react-router-dom` | Rotas e rotas protegidas |
| | `axios` | Cliente HTTP único (`src/services/api.js`) |
| | `recharts` | Gráficos dos relatórios |

---

## Estrutura de pastas

```
projeto2-financas/
├── backend/
│   ├── package.json
│   ├── .env.example                 → modelo das variáveis (o .env real NÃO vai para o Git)
│   ├── database/
│   │   ├── schema.sql               → DDL (tabelas, UNIQUE, CHECK, FKs, índices)
│   │   ├── criar-banco.js           → cria o banco (se preciso) e executa o schema.sql
│   │   └── seed.js                  → 2 usuários + 3 meses de lançamentos
│   ├── test/regras.test.js          → testes das regras puras (npm test)
│   └── src/
│       ├── server.js                → app Express, middlewares e rotas
│       ├── config/                  → env.js (configurações) e db.js (pool + transação)
│       ├── middlewares/             → autenticar.js (JWT), validacoes.js, erros.js, limitarLogin.js
│       ├── models/                  → acesso ao banco (único lugar com SQL)
│       │   └── regras/              → funções puras de negócio: cpf, faturas, dinheiro, datas
│       └── routes/                  → rotas + controladores (sem pasta controllers)
├── frontend/
│   ├── package.json
│   ├── .env.example                 → VITE_API_URL
│   ├── index.html
│   ├── public/logo.svg
│   └── src/
│       ├── main.jsx, App.jsx, index.css
│       ├── components/
│       │   ├── layout/              → Layout (menu), RotaProtegida, LayoutAutenticacao
│       │   ├── paginas/             → Login, Cadastro, Painel, Lançamentos, Categorias, ...
│       │   └── ui/                  → Campo, Modal, Estados, gráficos, ícones, logo
│       ├── contexts/AuthContext.jsx → usuário, token, login, logout, cadastrar
│       ├── services/api.js          → ÚNICO ponto de acesso à API (Axios + interceptors)
│       ├── hooks/useRequisicao.js   → estados de carregamento/erro/dados
│       └── utils/                   → formatadores (R$, datas), validações, cores dos gráficos
└── README.md
```

**Funções utilitárias puras** (`cpfValido`, `calcularFatura`, `dividirEmParcelas`, datas) ficam em
`backend/src/models/regras/`, por serem regras de negócio. O front-end tem cópias de `cpfValido` e
`calcularFatura` em `src/utils/` apenas para validar/mostrar prévias - **a regra que vale é a do servidor**.

---

## Como rodar do zero

### 1. Pré-requisitos

- **Node.js 18.18 ou superior** (`node -v`)
- **PostgreSQL 13 ou superior** rodando na máquina (usuário/senha que você conheça)

### 2. Back-end

```bash
cd backend
npm install
cp .env.example .env          # no Windows (PowerShell): copy .env.example .env
```

Edite o `.env`:

```ini
PORT=3000
DATABASE_URL=postgres://postgres:SUA_SENHA@localhost:5432/financas
JWT_SECRET=um-texto-longo-e-aleatorio
JWT_EXPIRES_IN=1h
CORS_ORIGIN=http://localhost:5173
```

> Para gerar um segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Crie o banco, as tabelas e os dados de demonstração, e suba a API:

```bash
npm run db:criar      # cria o banco "financas" (se não existir) e executa database/schema.sql
npm run db:seed       # 2 usuários + 3 meses de lançamentos (apaga os dados atuais!)
npm run dev           # API em http://localhost:3000/api
```

Teste rápido: `curl http://localhost:3000/api/status` → `{"status":"ok"}`.

> Se `npm run db:criar` não conseguir criar o banco (falta de permissão), crie-o manualmente com
> `createdb financas` (ou `CREATE DATABASE financas;` no psql/pgAdmin) e rode o comando de novo.

### 3. Front-end (em outro terminal)

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
```

Se a API estiver em outro endereço, crie `frontend/.env` com `VITE_API_URL=http://endereco:porta/api`.

### 4. Usuários de demonstração (criados pelo seed)

| Nome | E-mail | Senha | CPF |
|---|---|---|---|
| Ana Souza | `ana@email.com` | `Senha123` | 529.982.247-25 |
| Bruno Lima | `bruno@email.com` | `Senha123` | 111.444.777-35 |

As datas do seed são **relativas ao dia em que ele roda** (3 meses anteriores completos + mês atual até
hoje). Rode `npm run db:seed` de novo perto da apresentação para os dados ficarem atuais.

### Scripts

| Pasta | Comando | O que faz |
|---|---|---|
| backend | `npm run dev` | API com recarga automática (`node --watch`) |
| backend | `npm start` | API sem recarga |
| backend | `npm run db:criar` | Cria o banco e as tabelas (**apaga as tabelas existentes**) |
| backend | `npm run db:seed` | Carga inicial (**apaga todos os dados**) |
| backend | `npm run db:reset` | `db:criar` + `db:seed` |
| backend | `npm test` | Testes das regras (CPF, faturas, parcelas, datas) |
| frontend | `npm run dev` | Servidor de desenvolvimento do Vite |
| frontend | `npm run build` | Build de produção em `frontend/dist` |

---

## Rotas da API

Todas abaixo de `/api`. Exceto cadastro e login, **todas exigem** `Authorization: Bearer <token>`.

| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| POST | `/auth/cadastro` | Cadastra usuário (cria categorias e fontes padrão) | 201, 400, 409 |
| POST | `/auth/login` | Autentica e devolve `{ token, usuario }` | 200, 400, 401, 429 |
| GET | `/auth/me` | Dados do usuário logado | 200, 401 |
| GET | `/categorias?tipo=` | Lista categorias (com `totalLancamentos`) | 200 |
| POST | `/categorias` | Cria categoria | 201, 400, 409 |
| GET | `/categorias/:id` | Detalha | 200, 404 |
| PUT | `/categorias/:id` | Edita | 200, 400, 404, 409 |
| DELETE | `/categorias/:id[?moverPara=ID]` | Exclui; com lançamentos → 409, ou move para `moverPara` | 204, 400, 404, 409 |
| GET | `/fontes-destinos` | Lista fontes/destinos | 200 |
| POST | `/fontes-destinos` | Cria (cartão exige fechamento, vencimento e limite) | 201, 400, 409 |
| GET | `/fontes-destinos/:id` | Detalha | 200, 404 |
| PUT | `/fontes-destinos/:id` | Edita | 200, 400, 404, 409 |
| DELETE | `/fontes-destinos/:id` | Exclui (409 se tiver lançamentos) | 204, 404, 409 |
| GET | `/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=&porPagina=` | Lista com filtros, paginação e totais (padrão: mês corrente) | 200, 400 |
| POST | `/lancamentos` | Cria (com `totalParcelas` gera uma linha por parcela) | 201, 400, 404 |
| GET | `/lancamentos/:id` | Detalha | 200, 404 |
| PUT | `/lancamentos/:id` | Edita (mesmas validações da criação) | 200, 400, 404 |
| DELETE | `/lancamentos/:id[?todasParcelas=true]` | Exclui a parcela ou a compra inteira | 204, 404 |
| GET | `/relatorios/categorias?inicio=&fim=` | RF7 | 200, 400 |
| GET | `/relatorios/fontes-destinos?inicio=&fim=` | RF8 | 200, 400 |
| GET | `/relatorios/faturas?meses=3` | RF9 (todos os cartões) | 200, 400 |
| GET | `/saude-financeira` | Desafio | 200 |
| GET | `/status` | Saúde da API e do banco (público) | 200 |

Datas sempre no formato `AAAA-MM-DD`; valores em reais com até 2 casas (`"33.34"` ou `33.34`).

**Padrão único de erro** (todas as respostas de erro):

```json
{
  "erro": "Dados inválidos.",
  "campos": {
    "valor": "O valor deve ser maior que zero.",
    "categoriaId": "A categoria informada é de entrada, mas o lançamento é de saída."
  }
}
```

`campos` só aparece quando o erro é de campos específicos. Quem monta as respostas de erro é o
middleware central `src/middlewares/erros.js`.

---

## Modelo de dados e regras garantidas pelo banco

O DDL completo está em [`backend/database/schema.sql`](backend/database/schema.sql). Ele segue o modelo
mínimo do enunciado e **acrescenta** (sem remover nada):

- **Unicidade de e-mail e CPF por `UNIQUE`** (`usuarios_email_unico`, `usuarios_cpf_unico`). Não existe
  consulta prévia no código: duas requisições simultâneas não conseguem gravar duplicatas, porque quem
  recusa é o SGBD (erro `23505`), e o middleware de erros transforma isso em **409** indicando o campo.
- **Normalização antes de gravar**: e-mail com `trim().toLowerCase()` e CPF só com dígitos. Um `CHECK` no
  banco impede gravar e-mail fora de minúsculas ou CPF com pontuação.
- **Chaves estrangeiras compostas** em `lancamentos`:
  `(categoria_id, usuario_id, tipo) → categorias(id, usuario_id, tipo)` e
  `(fonte_destino_id, usuario_id) → fontes_destinos(id, usuario_id)`.
  Ou seja, o **próprio banco** recusa um lançamento com categoria/fonte de outro usuário ou com categoria
  de tipo diferente. A API também valida antes, para dar mensagens amigáveis.
- `CHECK` em `valor > 0`, `tipo`, `total_parcelas BETWEEN 1 AND 48`, `parcela_atual <= total_parcelas`,
  dias 1–31 e cartão com fechamento/vencimento/limite obrigatórios.
- Nomes únicos sem diferenciar maiúsculas (`Lazer` = `lazer`) por índices únicos em `lower(nome)`.
- Dinheiro em `NUMERIC(12,2)`; no JavaScript, os cálculos são feitos em **centavos inteiros**.
- Campos extras usados no desafio: `categorias.grupo_orcamento` (regra 50/30/20) e
  `fontes_destinos.reserva` (reserva de emergência).

---

## Regras de negócio

### Isolamento entre usuários (RF3)

- O id do usuário vem **sempre do token** (`req.usuarioId`, preenchido por `middlewares/autenticar.js`).
- Todas as consultas dos models filtram por `usuario_id`.
- Registro de outro usuário responde **404** (para quem pediu, ele "não existe").

### Parcelamento (RF6)

- Só saídas em **cartão de crédito** podem ser parceladas (1 a 48×).
- A API grava **uma linha por parcela**, com o mesmo `grupo_parcelamento` (UUID) e `parcela_atual` de 1 a N,
  **dentro de uma transação** (todas ou nenhuma).
- O valor é dividido em centavos e a diferença vai para a 1ª parcela: R$ 100,00 em 3× → 33,34 + 33,33 + 33,33.
- Ao editar uma parcela, os dados da compra (descrição, data, categoria, cartão) valem para todas as
  parcelas; o valor muda só na parcela editada. Para mudar o número de parcelas, exclua e lance de novo.
- Ao excluir uma parcela, o front pergunta se é só ela ou a compra inteira (`?todasParcelas=true`).

### Faturas (RF9) - decisão de modelagem

Escolhemos a 1ª opção da dica do enunciado: **cada parcela guarda a data da compra** e a fatura é calculada
na hora com `calcularFatura(data, cartao, parcela_atual)` (`models/regras/faturas.js`).
Justificativa: se o usuário mudar o dia de fechamento/vencimento do cartão, todas as faturas se ajustam
sozinhas, sem reescrever dados no banco.

- Compra **antes** do dia de fechamento → fatura que fecha no mesmo mês; **no dia ou depois** → mês seguinte.
- A parcela *k* cai *k − 1* meses depois da fatura da 1ª.
- Vencimento > fechamento → vence no mesmo mês do fechamento; senão, no mês seguinte.
- Dia inexistente (31 em fevereiro) → último dia do mês.
- Limite utilizado = soma de todas as parcelas cujas faturas **ainda não venceram**.
- A tela mostra a fatura fechada ainda não paga (se houver), a **aberta** e as próximas N (padrão 3).

### Relatórios (RF7 e RF8)

- Totais calculados no banco com `GROUP BY`/`SUM` (`models/Relatorio.js`).
- Os relatórios usam a **data do lançamento** (data da compra). Assim, uma compra parcelada aparece inteira
  no mês em que foi feita; a visão "quando o dinheiro sai" está nas faturas e na projeção de saldo.
- Comparação com o **período anterior de mesmo tamanho**: se o período é de meses inteiros (ex.: outubro),
  compara com os meses inteiros anteriores (setembro); senão, com o mesmo número de dias imediatamente antes.

---

## Segurança

- Senhas com **bcrypt** (hash + salt, custo 10). `senha_hash` nunca aparece em resposta (só a consulta de login o lê).
- Login com mensagem genérica ("E-mail ou senha inválidos") e tempo de resposta igual para e-mail inexistente.
- **JWT** com expiração (`JWT_EXPIRES_IN`, padrão 1 h), algoritmo fixado em HS256.
- **Rate limiting** no login: 10 tentativas com falha a cada 15 minutos por IP (resposta 429).
- **Consultas parametrizadas** (`$1, $2...`) em todo o SQL - nada de concatenar texto do usuário.
- **Validação e sanitização** de todas as entradas no servidor (`middlewares/validacoes.js`): tipos,
  tamanhos, datas reais, valores com 2 casas, remoção de caracteres de controle e espaços extras.
- **CORS** restrito à origem do front (`CORS_ORIGIN`).
- Segredos só no `.env` (ignorado pelo Git); o `.env.example` é versionado.

## Front-end

- `AuthContext` guarda usuário e token (no `localStorage`, sobrevive ao recarregamento) e expõe `login`,
  `logout` e `cadastrar`.
- `services/api.js` é o único ponto de acesso à API: adiciona o `Authorization` automaticamente e, ao
  receber **401**, faz logout e volta ao login com o aviso "Sua sessão expirou". Além disso, o
  `AuthContext` agenda o logout para o instante em que o token expira, mesmo sem nenhuma requisição.
- Rotas protegidas (`RotaProtegida`) redirecionam para `/login`.
- Todas as telas tratam **carregando**, **lista vazia** e **erro** (`components/ui/Estados.jsx`).
- Erros do servidor aparecem **junto ao campo** (ex.: "Já existe um usuário com este CPF").
- Máscaras de CPF e de dinheiro; valores com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
  e datas no formato brasileiro.

---

## Saúde financeira (desafio)

Rota `GET /api/saude-financeira`, cálculos em `models/SaudeFinanceira.js`. A página exibe em texto visível
que as informações são **educativas e não constituem recomendação financeira profissional**.

Base de comparação: os **3 meses completos anteriores** ao mês atual.

| Indicador | Cálculo | Regras das dicas (limites) |
|---|---|---|
| Taxa de poupança | (entradas − saídas) ÷ entradas do último mês completo | ≥ 10% bom · 0–10% atenção · < 0 crítico |
| Comprometimento com cartões | faturas a vencer nos próximos 3 meses ÷ (renda média mensal × 3) | ≤ 30% bom · 30–50% atenção · > 50% crítico |
| Parcelas futuras | soma das parcelas a vencer, por mês da fatura | atenção se passar de 3 meses de renda |
| Regra 50/30/20 | necessidades, desejos e poupança como % da renda (3 meses). Categorias sem classificação contam como desejo; poupança = renda − necessidades − desejos | bom se necessidades ≤ 50%, desejos ≤ 30% e poupança ≥ 20%; crítico se poupança < 0 |
| Projeção de saldo (gráfico) | saldo acumulado até o fim do mês atual + 6 meses de: média de entradas − média de gastos à vista − parcelas já conhecidas (regime de caixa: compra no cartão conta no vencimento da fatura) | crítico se o saldo projetado ficar negativo |
| Categoria fora da curva | gasto do mês na categoria × média dos 3 meses anteriores | acima de 30% **e** pelo menos R$ 50,00 acima |
| Reserva de emergência | saldo das contas marcadas como reserva ÷ média de saídas mensais | ≥ 3 meses bom · 1–3 atenção · < 1 crítico |

Os limites estão na constante `LIMITES` do arquivo, para facilitar ajustes.

---

## Ferramentas de apoio

Foi utilizada IA (Google Gemini) como apoio no desenvolvimento, principalmente para esclarecimento de dúvidas e auxílio na resolução de problemas.
