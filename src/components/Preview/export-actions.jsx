import { generateLatex } from '../../utils/latex';
import { apiExportDocumentPdf, apiExportDocumentTex } from '../../api/client';

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
      downloadBlob(blob, `${currentDocument?.id || 'documento'}.${isZip ? 'zip' : 'tex'}`);
    })
    .catch((error) => {
      const tex = generateLatex(structure, formData, {
        ...coverConfig,
        title: currentDocument?.name || coverConfig.title
      });
      const blob = new Blob([tex], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, `${currentDocument?.id || 'documento'}.tex`);
      pushToast(`Se usó exportación local TEX: ${error?.message || 'API no disponible'}`, 'warning');
    });
}

export function exportDocumentPdf({ payload, pushToast }) {
  return apiExportDocumentPdf(payload)
    .then((blob) => {
      downloadBlob(blob, `${payload.documentId || 'documento'}.pdf`);
    })
    .catch((error) => {
      pushToast(error?.message || 'No se pudo compilar el PDF.', 'warning');
    });
}
