import { generateLatex } from '../../utils/latex';
import { apiExportDocumentPdf, apiExportDocumentTex } from '../../api/client';

function sanitizeFilename(name, maxLen = 50) {
  const safe = String(name || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .trim();
  return safe.length > maxLen ? safe.slice(0, maxLen) : safe;
}

function buildExportFilename(docId, docName, ext) {
  const name = sanitizeFilename(docName);
  const suffix = String(docId || '').slice(0, 8);
  return `${name}-${suffix}.${ext}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportDocumentTex({ payload, structure, formData, coverConfig, currentDocument, pushToast }) {
  return apiExportDocumentTex(payload)
    .then((blob) => {
      const isZip = String(blob?.type || '').includes('zip');
      const filename = buildExportFilename(currentDocument?.id, currentDocument?.name, isZip ? 'zip' : 'tex');
      downloadBlob(blob, filename);
    })
    .catch((error) => {
      const tex = generateLatex(structure, formData, {
        ...coverConfig,
        title: currentDocument?.name || coverConfig.title
      });
      const blob = new Blob([tex], { type: 'text/plain;charset=utf-8' });
      const filename = buildExportFilename(currentDocument?.id, currentDocument?.name, 'tex');
      downloadBlob(blob, filename);
      pushToast(`Se usó exportación local TEX: ${error?.message || 'API no disponible'}`, 'warning');
    });
}

export function exportDocumentPdf({ payload, pushToast }) {
  return apiExportDocumentPdf(payload)
    .then((blob) => {
      const filename = buildExportFilename(payload.documentId, payload.documentName, 'pdf');
      downloadBlob(blob, filename);
    })
    .catch((error) => {
      const msg = error?.message || '';
      const detail = error?.detail || '';
      const userMsg = detail ? `${msg}: ${detail}` : msg;
      pushToast(userMsg || 'No se pudo compilar el PDF.', 'error');
    });
}
