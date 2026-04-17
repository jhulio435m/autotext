import { generateLatex } from '../src/utils/latex.js';

export function generateDocumentLatex({ documentName, structure, formData, coverData }) {
  return generateLatex(structure, formData, {
    ...(coverData || {}),
    title: documentName || coverData?.title || ''
  });
}
