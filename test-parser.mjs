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
  grab(/^const TRANSFER_RE=.*$/m),
  grab(/^function droppedStudents\(rows\).*$/m),
  grab(/^const SEM_PROVA_RECUPERACAO=.*$/m),
  grab(/^function temProvaDeRecuperacao\(disciplina\).*$/m),
  'export { normalizeSchoolName, cleanClassName, TURMA_RE, TURMA_NOME_RE, droppedStudents, temProvaDeRecuperacao };',
].join('\n');

const { normalizeSchoolName, cleanClassName, TURMA_RE, TURMA_NOME_RE, droppedStudents, temProvaDeRecuperacao } = await import(
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

// --- exclusão de transferidos ---------------------------------------------
// A situação é da linha, não do aluno.
const cabecalho = ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)'];

// Caso real da 1ª SÉRIE A: quatro linhas para a mesma aluna, duas de baixa e
// duas ativas. Ela continua matriculada, então nenhuma linha dela sai.
const lauanda = droppedStudents([
  cabecalho,
  ['LAUANDA SUELI FELIPE DE BRITO', 'Baixa - Transferência', ''],
  ['LAUANDA SUELI FELIPE DE BRITO', 'Baixa - Transferência', '4'],
  ['LAUANDA SUELI FELIPE DE BRITO', 'Ativo', '3'],
  ['LAUANDA SUELI FELIPE DE BRITO', 'Ativo', '3'],
]);
assert.equal(lauanda.size, 0, 'aluna com linha ativa não pode ser excluída');

// Aluno só com linha de transferência continua fora da lista.
const so_transferido = droppedStudents([
  cabecalho,
  ['ANTONIO CARLOS SOUSA DA SILVA', 'Transferido', '2'],
  ['OUTRO ALUNO ATIVO', 'Ativo', '3'],
]);
assert.ok(so_transferido.has('ANTONIO CARLOS SOUSA DA SILVA'), 'transferido puro sai');
assert.ok(!so_transferido.has('OUTRO ALUNO ATIVO'), 'ativo fica');
assert.equal(so_transferido.size, 1);

// As outras marcas de saída que o Mapão usa.
for (const marca of ['Transferida', 'Transferência', 'Baixa de transferência', 'Matrícula baixada']) {
  const saiu = droppedStudents([cabecalho, ['FULANO DE TAL', marca, '2']]);
  assert.ok(saiu.has('FULANO DE TAL'), `marca não reconhecida: ${marca}`);
}

// Linha sem nome não vira chave, e acento não muda o resultado.
const comAcento = droppedStudents([cabecalho, ['', 'Transferido', ''], ['JOÃO DA SILVA', 'Transferido', '2']]);
assert.ok(comAcento.has('JOAO DA SILVA'), 'chave é comparada sem acento');
assert.equal(comAcento.size, 1);

// --- componentes sem prova de recuperação ---------------------------------
// FAQ da Recuperação Semestral 2026, item 6.1.
const semProva = ['ARTE', 'Arte', 'EDUCACAO FISICA', 'Educação Física', 'PROJETO DE VIDA', 'REDAÇAO E LEITURA', 'Redação e Leitura'];
for (const d of semProva) {
  assert.equal(temProvaDeRecuperacao(d), false, `devia ficar fora: ${d}`);
}

// Os componentes da Prova Paulista continuam entrando.
const comProva = ['MATEMATICA', 'LINGUA PORTUGUESA', 'HISTORIA', 'GEOGRAFIA', 'CIENCIAS', 'BIOLOGIA', 'FISICA', 'QUIMICA', 'FILOSOFIA', 'SOCIOLOGIA', 'LINGUA INGLESA'];
for (const d of comProva) {
  assert.equal(temProvaDeRecuperacao(d), true, `devia entrar: ${d}`);
}

// ESPORTE-MUSICA-ARTE termina em ARTE e não pode ser pego pela exclusão.
assert.equal(temProvaDeRecuperacao('ESPORTE-MUSICA-ARTE'), true, 'comparação é exata, não por trecho');

// Componentes de itinerário seguem na lista até a Diretoria de Ensino confirmar.
for (const d of ['ORIENTAÇAO DE ESTUDO - MATEMATICA', 'PRATICAS EXPERIMENTAIS', 'ROBOTICA', 'ELETIVAS']) {
  assert.equal(temProvaDeRecuperacao(d), true, `ainda não é para excluir: ${d}`);
}

const totalSemProva = semProva.length + comProva.length + 1 + 4;
console.log(`ok — ${escolas.length} casos de escola, ${turmas.length} de turma, 4 de TURMA_RE, 9 de droppedStudents, ${totalSemProva} de temProvaDeRecuperacao`);
