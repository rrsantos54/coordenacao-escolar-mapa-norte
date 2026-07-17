const DATABASE_NAME = 'Mapa Norte — Base de dados';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Mapa Norte — Coordenação escolar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
    sheet.appendRow(['Data', 'Usuário', 'Aluno', 'Turma', 'Disciplina', 'Nota primeiro bimestre', 'Nota segundo bimestre', 'Nota recuperação semestral', 'Bimestre substituído', 'Status']);
  }
  return SpreadsheetApp.openById(id);
}

function saveRecoveryBatch(records) {
  if (!Array.isArray(records)) throw new Error('Lote inválido.');
  const book = getDatabase_();
  const sheet = book.getSheetByName('Recuperação');
  const user = Session.getActiveUser().getEmail() || 'usuário institucional';
  const now = new Date();
  const values = records.map(row => [now, user, row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]]);
  if (!values.length) return { saved: 0, updated: 0, inserted: 0, spreadsheetId: book.getId() };

  // Autosalvamento deve atualizar o registro existente, nunca duplicá-lo.
  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 10).getValues() : [];
  const rowByKey = new Map();
  existing.forEach((row, index) => rowByKey.set(`${row[2]}|${row[3]}|${row[4]}`, index + 2));

  const updates = [];
  const inserts = [];
  values.forEach((value, index) => {
    const key = `${value[2]}|${value[3]}|${value[4]}`;
    const targetRow = rowByKey.get(key);
    if (targetRow) {
      updates.push({ row: targetRow, value });
    } else {
      inserts.push(value);
      rowByKey.set(key, lastRow + inserts.length);
    }
  });

  updates.forEach(item => sheet.getRange(item.row, 1, 1, 10).setValues([item.value]));
  if (inserts.length) sheet.getRange(lastRow + 1, 1, inserts.length, 10).setValues(inserts);
  return { saved: values.length, updated: updates.length, inserted: inserts.length, spreadsheetId: book.getId() };
}

function getDatabaseUrl() {
  return getDatabase_().getUrl();
}
