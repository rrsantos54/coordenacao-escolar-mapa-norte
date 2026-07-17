const DATABASE_NAME = 'Mapa Norte — Base de dados';
const MAX_BATCH_RECORDS = 2000;
const MAX_FIELD_LENGTH = 160;
const MAX_LOCK_WAIT_MS = 10000;
const DEFAULT_ALLOWED_EMAIL_DOMAINS = ['professor.educacao.sp.gov.br', 'educacao.sp.gov.br'];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Mapa Norte — Coordenação escolar');
}

function include(filename) {
  const content = HtmlService.createHtmlOutputFromFile(filename).getContent();
  return filename === 'styles' ? `<style>${content}</style>` : content;
}

function getDatabase_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('DATABASE_ID');
  if (!id) {
    const file = SpreadsheetApp.create(DATABASE_NAME);
    id = file.getId();
    props.setProperty('DATABASE_ID', id);
    const sheet = file.getSheets()[0];
    sheet.setName('Recuperação');
    sheet.appendRow(['Data', 'Usuário', 'Escola', 'Aluno', 'Turma', 'Disciplina', 'Nota primeiro bimestre', 'Nota segundo bimestre', 'Nota recuperação semestral', 'Bimestre substituído', 'Status']);
  }
  return SpreadsheetApp.openById(id);
}

function sanitizeCell_(value) {
  if (typeof value !== 'string') return value;
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function requireAuthorizedUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) throw new Error('Acesso exige conta Google institucional autenticada.');
  const configured = String(PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAIL_DOMAINS') || '').trim();
  const domains = (configured ? configured.split(',') : DEFAULT_ALLOWED_EMAIL_DOMAINS).map(domain => domain.trim().toLowerCase()).filter(Boolean);
  if (!domains.some(domain => email.endsWith(`@${domain}`))) throw new Error('Conta não autorizada para esta unidade escolar.');
  return email;
}

function canonicalKey_(values) {
  return JSON.stringify(values.map(value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()));
}

function validateRecoveryRecord_(row) {
  if (!Array.isArray(row) || row.length < 8) throw new Error('Registro de recuperação inválido.');
  const values = row.slice(0, 8);
  [0, 1, 2].forEach(index => {
    if (!String(values[index] || '').trim()) throw new Error('Aluno, turma e disciplina são obrigatórios.');
    if (String(values[index]).length > MAX_FIELD_LENGTH) throw new Error('Campo de identificação excede o limite permitido.');
  });
  [3, 4].forEach(index => {
    const raw = values[index];
    if (raw === '' || raw === '—' || raw === null || raw === undefined) return;
    const grade = Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(grade) || grade < 0 || grade > 10) throw new Error('Nota fora do intervalo de 0 a 10.');
  });
  const recovery = values[5];
  if (recovery !== '' && recovery !== '—' && recovery !== null && recovery !== undefined) {
    const grade = Number(String(recovery).replace(',', '.'));
    if (!Number.isInteger(grade) || grade < 1 || grade > 10) throw new Error('Nota de recuperação deve ser um número inteiro de 1 a 10.');
  }
  if (!['', '1º bimestre', '2º bimestre'].includes(values[6] || '')) throw new Error('Bimestre substituído inválido.');
  const hasRecovery = recovery !== '' && recovery !== '—' && recovery !== null && recovery !== undefined;
  const hasReplacement = Boolean(values[6]);
  const expectedStatus = hasRecovery && hasReplacement ? 'Concluído' : 'Pendente';
  if (values[7] !== expectedStatus) throw new Error('Status incompatível com nota e bimestre substituído.');
  return values.map(sanitizeCell_);
}

function saveRecoveryBatch(records, schoolName) {
  const user = requireAuthorizedUser_();
  if (!Array.isArray(records)) throw new Error('Lote inválido.');
  if (records.length > MAX_BATCH_RECORDS) throw new Error(`Lote excede o limite de ${MAX_BATCH_RECORDS} registros.`);
  schoolName = String(schoolName || '').trim();
  if (!schoolName || schoolName.length > MAX_FIELD_LENGTH) throw new Error('Nome da escola é obrigatório e deve ter até 160 caracteres.');
  const lock = LockService.getScriptLock();
  lock.waitLock(MAX_LOCK_WAIT_MS);
  try {
    const book = getDatabase_();
    const sheet = book.getSheetByName('Recuperação');
    const header = sheet.getRange(1, 1, 1, Math.max(11, sheet.getMaxColumns())).getValues()[0];
    if (header[2] !== 'Escola') {
      sheet.insertColumnBefore(3);
      sheet.getRange(1, 3).setValue('Escola');
    }
    const now = new Date();
    const values = records.map(row => [now, user, sanitizeCell_(schoolName), ...validateRecoveryRecord_(row)]);
    if (!values.length) return { saved: 0, updated: 0, inserted: 0 };

    // Autosalvamento deve atualizar o registro existente, nunca duplicá-lo.
    const lastRow = sheet.getLastRow();
    const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 11).getValues() : [];
    const rowByKey = new Map();
    existing.forEach((row, index) => rowByKey.set(canonicalKey_([row[2], row[3], row[4], row[5]]), index + 2));

    const updates = [];
    const inserts = [];
    values.forEach(value => {
      const key = canonicalKey_([value[2], value[3], value[4], value[5]]);
      const targetRow = rowByKey.get(key);
      if (targetRow) updates.push({ row: targetRow, value });
      else {
        inserts.push(value);
        rowByKey.set(key, lastRow + inserts.length);
      }
    });

    updates.forEach(item => sheet.getRange(item.row, 1, 1, 11).setValues([item.value]));
    if (inserts.length) sheet.getRange(lastRow + 1, 1, inserts.length, 10).setValues(inserts);
    return { saved: values.length, updated: updates.length, inserted: inserts.length };
  } finally {
    lock.releaseLock();
  }
}
