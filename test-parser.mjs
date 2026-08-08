// Checks do parser do Mapão. Roda com: node test-parser.mjs
// Lê as declarações direto do app.js publicado, para o teste não virar uma
// segunda cópia das regras que envelhece sozinha.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const grab = re => {
  const found = source.match(re);
  if (!found) throw new Error(`não achei no app.js: ${re}`);
  return found[0];
};

const modulo = [
  grab(/^function normal\(v\).*$/m),
  grab(/^const SCHOOL_TITLES=.*$/m),
  grab(/^function normalizeSchoolName\(name\).*$/m),
  grab(/^function cleanClassName\(v\).*$/m),
  grab(/^const TURMA_RE=.*$/m),
  grab(/^const TURMA_NOME_RE=.*$/m),
  'export { normalizeSchoolName, cleanClassName, TURMA_RE, TURMA_NOME_RE };',
].join('\n');

const { normalizeSchoolName, cleanClassName, TURMA_RE, TURMA_NOME_RE } = await import(
  'data:text/javascript,' + encodeURIComponent(modulo)
);

// --- nome da escola -------------------------------------------------------
const escolas = [
  // O caso real que motivou a correção: Mapão da E.E. de Sagres.
  ['Waldomiro Sampaio de Souza Prefeito', 'PREF. WALDOMIRO SAMPAIO DE SOUZA'],
  ['WALDOMIRO SAMPAIO DE SOUZA PREFEITO', 'PREF. WALDOMIRO SAMPAIO DE SOUZA'],
  ['Maria Aparecida Lima Professora', 'PROFA. MARIA APARECIDA LIMA'],
  ['João Batista Doutor', 'DR. JOÃO BATISTA'],
  // Acento sobrevive ao uppercase, inclusive no título com til.
  ['Antônio Carlos Capitão', 'CAP. ANTÔNIO CARLOS'],
  ['Conceição Aparecida Professora', 'PROFA. CONCEIÇÃO APARECIDA'],
  // Sem título honorífico no fim: só sobe para caixa alta.
  ['Jardim Paulista', 'JARDIM PAULISTA'],
  // Título já na frente não é mexido duas vezes.
  ['PREF. WALDOMIRO SAMPAIO DE SOUZA', 'PREF. WALDOMIRO SAMPAIO DE SOUZA'],
  // Nome de uma palavra só, vazio e nulo não quebram.
  ['Sagres', 'SAGRES'],
  ['', ''],
  [null, ''],
  [undefined, ''],
  // Espaço repetido do metadado da planilha some.
  ['  Waldomiro   Sampaio  Prefeito ', 'PREF. WALDOMIRO SAMPAIO'],
];

for (const [entrada, esperado] of escolas) {
  assert.equal(normalizeSchoolName(entrada), esperado, `escola: ${JSON.stringify(entrada)}`);
}

// --- turma pelo nome do arquivo ------------------------------------------
// No Mapão consolidado a turma não aparece dentro da planilha.
const turmaDoArquivo = nome => {
  const achou = String(nome).replace(/\.(xlsx|xls)$/i, '').match(TURMA_NOME_RE);
  return achou ? cleanClassName(achou[0]) : 'Turma não identificada';
};

const turmas = [
  // Ensino médio: SÉRIE com ordinal feminino. Era o caso que falhava.
  ['Mapao_Consolidado_1ª SERIE A INTEGRAL 9H ANUAL.xlsx', '1ª SERIE A INTEGRAL 9H ANUAL'],
  ['Mapao_Consolidado_3ª SERIE A INTEGRAL 9H ANUAL.xlsx', '3ª SERIE A INTEGRAL 9H ANUAL'],
  // Fundamental: ANO, com ° e com º, que são caracteres diferentes.
  ['Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL.xlsx', '6° ANO A INTEGRAL 9H ANUAL'],
  ['Mapao_Consolidado_9º ANO A INTEGRAL 9H ANUAL.xlsx', '9º ANO A INTEGRAL 9H ANUAL'],
  // Nome por bimestre usa _ como separador, que este regex não atravessa de
  // propósito: casaria só "7º ANO" e perderia o "A", juntando turmas
  // diferentes do mesmo ano numa ATA só. Esses arquivos trazem a turma dentro
  // da planilha, então o nome do arquivo nem chega a ser consultado.
  ['MAPAO_ESCOLA_7º_ANO_A_CONSELHO_PRIMEIRO_BIMESTRE.xlsx', 'Turma não identificada'],
  // Acentuado e sem ordinal continuam sendo reconhecidos.
  ['Mapao_2ª Série B.xlsx', '2ª Série B'],
  ['Mapao_Consolidado_AEE_A_MANHA.xlsx', 'Turma não identificada'],
];

for (const [nome, esperado] of turmas) {
  assert.equal(turmaDoArquivo(nome), esperado, `turma: ${nome}`);
}

// TURMA_RE é o que varre as células da planilha por bimestre.
assert.ok(TURMA_RE.test('6º ANO A'), 'TURMA_RE devia achar ANO');
assert.ok(TURMA_RE.test('1ª SERIE A'), 'TURMA_RE devia achar SERIE');
assert.ok(TURMA_RE.test('2ª Série B'), 'TURMA_RE devia achar Série acentuado');
assert.ok(!TURMA_RE.test('ANUAL 9H'), 'TURMA_RE não devia casar texto solto');

console.log(`ok — ${escolas.length} casos de escola, ${turmas.length} de turma, 4 de TURMA_RE`);
