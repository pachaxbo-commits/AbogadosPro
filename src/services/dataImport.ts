import type { Caso, Cliente, EstadoCaso, ParticipacionCaso, TipoIdentificacionJudicial } from '../types';

export const IMPORT_HEADERS = [
  'Tipo', 'Referencia cliente', 'Tipo de cliente', 'Nombre del cliente', 'Teléfono', 'Correo', 'CI/NIT', 'Dirección', 'Notas',
  'Nombre del caso', 'Área', 'Estado', 'Rol del cliente', 'Tipo de identificación judicial', 'Número de NUREJ/CUD',
  'Descripción', 'Honorarios acordados (Bs)', 'Juzgado/Tribunal',
] as const;
type Header = (typeof IMPORT_HEADERS)[number];
const CLIENT_HEADERS = ['Tipo de cliente', 'Nombre del cliente / Razón social', 'Teléfono', 'Correo', 'CI/NIT', 'Dirección', 'Notas'] as const;
const CASE_HEADERS = ['CI/NIT del cliente', 'Nombre del caso', 'Área', 'Estado', 'Rol del cliente', 'Tipo de identificación judicial', 'Número judicial', 'Descripción / notas', 'Honorarios acordados (Bs)', 'Juzgado / tribunal / fiscal'] as const;
type SheetName = 'CLIENTES' | 'CASOS';
export interface ImportRow { row: number; sheet?: SheetName; values: Record<Header, string> }
export interface ImportIssue { row: number; sheet?: SheetName; field: string; reason: string }
export interface ImportClient { row: number; sheet?: SheetName; reference: string; data: Omit<Cliente, 'id' | 'fechaRegistro'> }
export interface ImportCase { row: number; sheet?: SheetName; reference: string; data: Omit<Caso, 'id' | 'fechaCreacion' | 'clienteId'> }
export interface ImportReview { clientsDetected: number; casesDetected: number; clients: ImportClient[]; cases: ImportCase[]; issues: ImportIssue[]; rows: { row: number; sheet?: SheetName; type: string; label: string; valid: boolean }[] }

const clean = (value: unknown) => String(value ?? '').trim();
const normal = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
const identity = (value: string) => normal(value).replace(/^(ci|nit)\s*/, '').replace(/[\s.\-]/g, '');
const states: EstadoCaso[] = ['Activo', 'En trámite', 'En espera', 'Concluido'];
const roles: ParticipacionCaso[] = ['Demandante', 'Demandado', 'Querellante', 'Imputado', 'Recurrente', 'Tercero interesado', 'Solicitante'];

export async function readImportFile(file: File): Promise<ImportRow[]> {
  if (!/\.(xlsx|csv)$/i.test(file.name)) throw new Error('Selecciona un archivo .xlsx o .csv.');
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
  if (/\.xlsx$/i.test(file.name) && workbook.SheetNames.some((value) => ['clientes', 'casos'].includes(normal(value)))) {
    const result: ImportRow[] = [];
    for (const [name, required] of [['CLIENTES', CLIENT_HEADERS], ['CASOS', CASE_HEADERS]] as const) {
      const sheetName = workbook.SheetNames.find((value) => normal(value) === normal(name));
      const sheet = sheetName && workbook.Sheets[sheetName];
      if (!sheet) throw new Error(`Falta la hoja ${name} en el Excel.`);
      const lines = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '', blankrows: true });
      const headers = (lines[0] || []).map(clean);
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`En ${name} faltan columnas: ${missing.join(', ')}.`);
      const indices = required.map((header) => headers.indexOf(header));
      for (const [index, cells] of lines.slice(1).entries()) {
        const fields = Object.fromEntries(required.map((header, position) => [header, clean(cells[indices[position]])])) as Record<(typeof required)[number], string>;
        if (!Object.values(fields).some(Boolean)) continue;
        const values = Object.fromEntries(IMPORT_HEADERS.map((header) => [header, ''])) as Record<Header, string>;
        values.Tipo = name === 'CLIENTES' ? 'Cliente' : 'Caso';
        if (name === 'CLIENTES') {
          const client = fields as Record<(typeof CLIENT_HEADERS)[number], string>;
          values['Referencia cliente'] = client['CI/NIT'];
          values['Tipo de cliente'] = client['Tipo de cliente'];
          values['Nombre del cliente'] = client['Nombre del cliente / Razón social'];
          for (const header of ['Teléfono', 'Correo', 'CI/NIT', 'Dirección', 'Notas'] as const) values[header] = client[header];
        } else {
          const caso = fields as Record<(typeof CASE_HEADERS)[number], string>;
          values['Referencia cliente'] = caso['CI/NIT del cliente'];
          for (const header of ['Nombre del caso', 'Área', 'Estado', 'Rol del cliente', 'Tipo de identificación judicial', 'Honorarios acordados (Bs)'] as const) values[header] = caso[header];
          values['Número de NUREJ/CUD'] = caso['Número judicial'];
          values.Descripción = caso['Descripción / notas'];
          values['Juzgado/Tribunal'] = caso['Juzgado / tribunal / fiscal'];
        }
        result.push({ row: index + 2, sheet: name, values });
      }
    }
    return result;
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('El archivo no contiene una hoja de datos.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '', blankrows: true });
  const headers = (rows[0] || []).map(clean);
  const missing = IMPORT_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Faltan columnas de la plantilla: ${missing.join(', ')}.`);
  const indices = IMPORT_HEADERS.map((header) => headers.indexOf(header));
  return rows.slice(1).flatMap((cells, index) => {
    const values = Object.fromEntries(IMPORT_HEADERS.map((header, position) => [header, clean(cells[indices[position]])])) as Record<Header, string>;
    return Object.values(values).some(Boolean) ? [{ row: index + 2, values }] : [];
  });
}

export async function downloadImportTemplate(format: 'xlsx' | 'csv'): Promise<void> {
  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const book = XLSX.utils.book_new();
    for (const [name, headers] of [['CLIENTES', CLIENT_HEADERS], ['CASOS', CASE_HEADERS]] as const) {
      const sheet = XLSX.utils.aoa_to_sheet([[...headers]]);
      sheet['!cols'] = headers.map((header) => ({ wch: Math.min(42, Math.max(18, header.length + 3)) }));
      sheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };
      XLSX.utils.book_append_sheet(book, sheet, name);
    }
    XLSX.writeFile(book, 'abogadospro_importacion.xlsx');
    return;
  }
  const content = '\uFEFF' + IMPORT_HEADERS.map((header) => `"${header.replace(/"/g, '""')}"`).join(',') + '\r\n';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'abogadospro_importacion.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reviewImport(rows: ImportRow[], existingClients: Cliente[], existingCases: Caso[], areas: readonly string[]): ImportReview {
  const issues: ImportIssue[] = [];
  const clients: ImportClient[] = [];
  const cases: ImportCase[] = [];
  const clientRefs = new Set<string>();
  const existingReference = (reference: string) => existingClients.find((item) => item.id === reference || (item.identificacion && identity(item.identificacion) === identity(reference)));
  const seenNames = new Set(existingClients.map((item) => normal(item.nombre)));
  const seenIdentities = new Set(existingClients.map((item) => identity(item.identificacion || '')).filter(Boolean));
  const issue = (source: ImportRow, field: string, reason: string) => { issues.push({ row: source.row, sheet: source.sheet, field, reason }); };
  const hasIssue = (source: ImportRow) => issues.some((item) => item.row === source.row && item.sheet === source.sheet);
  const clientRows = rows.filter((item) => normal(item.values.Tipo) === 'cliente');
  const caseRows = rows.filter((item) => normal(item.values.Tipo) === 'caso');

  for (const source of clientRows) {
    const { row, sheet, values } = source;
    const reference = values['Referencia cliente'];
    const referenceKey = sheet ? identity(reference) : reference;
    const name = values['Nombre del cliente'];
    const kind = values['Tipo de cliente'];
    if (!reference && !sheet) issue(source, 'Referencia cliente', 'Falta referencia.');
    else if (reference && (clientRefs.has(referenceKey) || existingReference(reference))) issue(source, sheet ? 'CI/NIT' : 'Referencia cliente', 'Identificación o referencia duplicada o ya utilizada.');
    if (kind !== 'Persona' && kind !== 'Empresa') issue(source, 'Tipo de cliente', 'Elige Persona o Empresa.');
    if (!name) issue(source, 'Nombre del cliente', 'Falta nombre o razón social.');
    else if (seenNames.has(normal(name))) issue(source, 'Nombre del cliente', 'Posible duplicado: ya existe un cliente con ese nombre.');
    const identification = values['CI/NIT'];
    if (identification && seenIdentities.has(identity(identification))) issue(source, 'CI/NIT', 'Posible duplicado: la identificación ya existe.');
    const email = values.Correo;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issue(source, 'Correo', 'Correo no válido.');
    if (hasIssue(source)) continue;
    if (reference) clientRefs.add(referenceKey);
    seenNames.add(normal(name));
    if (identification) seenIdentities.add(identity(identification));
    clients.push({ row, sheet, reference, data: {
      tipoCliente: kind as 'Persona' | 'Empresa', nombre: name, telefono: values.Teléfono,
      correo: email || undefined, identificacion: identification || undefined,
      direccion: values.Dirección || undefined, notas: values.Notas || undefined,
    } });
  }

  const caseNames = new Set<string>();
  const caseIdentifiers = new Set<string>();
  for (const source of caseRows) {
    const { row, sheet, values } = source;
    const reference = values['Referencia cliente'];
    const name = values['Nombre del caso'];
    const area = values.Área;
    const state = values.Estado;
    const role = values['Rol del cliente'];
    const idType = values['Tipo de identificación judicial'];
    const idNumber = values['Número de NUREJ/CUD'];
    if (!reference) issue(source, sheet ? 'CI/NIT del cliente' : 'Referencia cliente', 'Falta el cliente asociado.');
    else if (!clientRefs.has(sheet ? identity(reference) : reference) && !existingReference(reference)) issue(source, sheet ? 'CI/NIT del cliente' : 'Referencia cliente', sheet ? 'Cliente asociado no encontrado por CI/NIT.' : 'Cliente asociado no encontrado. Usa una referencia de esta plantilla, un ID o un CI/NIT existente.');
    if (!name) issue(source, 'Nombre del caso', 'Falta nombre o carátula.');
    if (!areas.includes(area)) issue(source, 'Área', 'Área jurídica no disponible en Configuración.');
    if (!states.includes(state as EstadoCaso)) issue(source, 'Estado', 'Estado no válido.');
    if (!roles.includes(role as ParticipacionCaso)) issue(source, 'Rol del cliente', 'Rol no válido.');
    if (idType && idType !== 'NUREJ' && idType !== 'CUD') issue(source, 'Tipo de identificación judicial', 'Usa NUREJ o CUD.');
    const feeText = values['Honorarios acordados (Bs)'];
    const fee = feeText ? Number(feeText.replace(',', '.')) : 0;
    if (!Number.isFinite(fee) || fee < 0) issue(source, 'Honorarios acordados (Bs)', 'Ingresa un monto numérico no negativo.');
    const key = (sheet ? identity(reference) : normal(reference)) + ':' + normal(name);
    if (name && caseNames.has(key)) issue(source, 'Nombre del caso', 'Posible caso duplicado en el archivo.');
    if (name && existingCases.some((item) => normal(item.nombre) === normal(name) && (item.clienteId === reference || existingReference(reference)?.id === item.clienteId))) issue(source, 'Nombre del caso', 'Posible caso duplicado existente.');
    if (idNumber && existingCases.some((item) => item.tipoIdentificacionJudicial === (idType || 'NUREJ') && normal(item.numeroIdentificacionJudicial) === normal(idNumber))) issue(source, 'Número de NUREJ/CUD', 'Posible identificación judicial duplicada.');
    const judicialKey = `${idType || 'NUREJ'}:${normal(idNumber)}`;
    if (idNumber && caseIdentifiers.has(judicialKey)) issue(source, 'Número de NUREJ/CUD', 'Identificación judicial repetida en el archivo.');
    if (hasIssue(source)) continue;
    caseNames.add(key);
    if (idNumber) caseIdentifiers.add(judicialKey);
    cases.push({ row, sheet, reference, data: {
      nombre: name, area, estado: state as EstadoCaso, participacion: role as ParticipacionCaso,
      tipoIdentificacionJudicial: (idType || 'NUREJ') as TipoIdentificacionJudicial,
      numeroIdentificacionJudicial: idNumber,
      descripcion: values.Descripción || 'Sin descripción detallada.',
      honorariosAcordados: fee, juzgadoTribunal: values['Juzgado/Tribunal'] || undefined,
    } });
  }

  for (const source of rows) if (!['cliente', 'caso'].includes(normal(source.values.Tipo))) issue(source, 'Tipo', 'Usa Cliente o Caso.');
  return {
    clientsDetected: clientRows.length, casesDetected: caseRows.length, clients, cases, issues,
    rows: rows.map((source) => ({ row: source.row, sheet: source.sheet, type: source.values.Tipo || '—', label: normal(source.values.Tipo) === 'cliente' ? source.values['Nombre del cliente'] : source.values['Nombre del caso'], valid: !hasIssue(source) })),
  };
}
