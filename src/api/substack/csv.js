export function parseCsv(text) {
  if (text.trim() === '') return {header: [], rows: []};
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const endField = () => { record.push(field); field = ''; };
  const endRecord = () => { endField(); records.push(record); record = []; };
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } quoted = false; i += 1; continue; }
      field += char; i += 1; continue;
    }
    if (char === '"' && field === '') { quoted = true; i += 1; continue; }
    if (char === ',') { endField(); i += 1; continue; }
    if (char === '\n' || char === '\r') { endRecord(); i += char === '\r' && text[i + 1] === '\n' ? 2 : 1; continue; }
    field += char; i += 1;
  }
  if (field !== '' || record.length > 0 || quoted) endRecord();
  const [header = [], ...rows] = records;
  return {header, rows};
}
