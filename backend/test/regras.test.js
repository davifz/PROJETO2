// Testes das regras de negócio  
// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpfValido } from '../src/models/regras/cpf.js';
import { calcularFatura } from '../src/models/regras/faturas.js';
import { dividirEmParcelas, paraCentavos, centavosParaDecimal } from '../src/models/regras/dinheiro.js';
import { dataValida, periodoAnterior, adicionarMeses } from '../src/models/regras/datas.js';

test('CPF: dígitos verificadores', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('52998224725'), true);
  assert.equal(cpfValido('529.982.247-24'), false);   // dígito errado
  assert.equal(cpfValido('111.111.111-11'), false);   // todos iguais
  assert.equal(cpfValido('1234567890'), false);       // 10 dígitos
  assert.equal(cpfValido('111.444.777-35'), true);
});

test('Faturas: exemplos da Tabela 10.3 do enunciado', () => {
  const nubank = { diaFechamento: 3, diaVencimento: 10 };
  const visa = { diaFechamento: 25, diaVencimento: 5 };

  assert.deepEqual(calcularFatura('2026-11-02', nubank, 1),
    { referencia: '2026-11', fechamento: '2026-11-03', vencimento: '2026-11-10' });
  // compra no dia do fechamento → fatura do mês seguinte
  assert.deepEqual(calcularFatura('2026-11-03', nubank, 1),
    { referencia: '2026-12', fechamento: '2026-12-03', vencimento: '2026-12-10' });
  assert.deepEqual(calcularFatura('2026-12-28', visa, 1),
    { referencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05' });
  assert.deepEqual(calcularFatura('2026-12-20', visa, 3),
    { referencia: '2027-03', fechamento: '2027-02-25', vencimento: '2027-03-05' });
});

test('Faturas: dia 31 em fevereiro vira o último dia do mês', () => {
  const cartao = { diaFechamento: 31, diaVencimento: 10 };
  assert.deepEqual(calcularFatura('2027-01-15', cartao, 2),
    { referencia: '2027-03', fechamento: '2027-02-28', vencimento: '2027-03-10' });
  // 28/02 é o "dia 31" de fevereiro → compra nesse dia vai para a fatura seguinte
  assert.equal(calcularFatura('2027-02-28', cartao, 1).fechamento, '2027-03-31');
});

test('Parcelas: R$ 100,00 em 3× → 33,34 + 33,33 + 33,33 (soma exata)', () => {
  const parcelas = dividirEmParcelas(10000, 3);
  assert.deepEqual(parcelas, [3334, 3333, 3333]);
  assert.equal(parcelas.reduce((a, b) => a + b, 0), 10000);
  assert.deepEqual(dividirEmParcelas(420000, 10), Array(10).fill(42000));
  assert.equal(dividirEmParcelas(1, 3).reduce((a, b) => a + b, 0), 1);
});

test('Dinheiro: conversão para centavos sem float', () => {
  assert.equal(paraCentavos(33.34), 3334);
  assert.equal(paraCentavos('33,34'), 3334);
  assert.equal(paraCentavos('1.234,56'), 123456);
  assert.equal(paraCentavos('0.1'), 10);
  assert.equal(paraCentavos(0.1 + 0.2), 30);
  assert.equal(paraCentavos(10.005), null);           // mais de 2 casas
  assert.equal(paraCentavos('abc'), null);
  assert.equal(centavosParaDecimal(3334), '33.34');
  assert.equal(centavosParaDecimal(5), '0.05');
});

test('Datas: validação e período anterior', () => {
  assert.equal(dataValida('2026-02-29'), false);
  assert.equal(dataValida('2028-02-29'), true);
  assert.equal(dataValida('2026-13-01'), false);
  assert.deepEqual(periodoAnterior('2026-10-01', '2026-10-31'), { inicio: '2026-09-01', fim: '2026-09-30' });
  assert.deepEqual(periodoAnterior('2026-03-01', '2026-03-31'), { inicio: '2026-02-01', fim: '2026-02-28' });
  assert.deepEqual(periodoAnterior('2026-10-10', '2026-10-19'), { inicio: '2026-09-30', fim: '2026-10-09' });
  assert.equal(adicionarMeses('2026-01-31', 1), '2026-02-28');
});
