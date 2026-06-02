const MAX_NAME_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CODE_LENGTH = 100;
const MAX_COMPANY_NAME_LENGTH = 500;
const MAX_URL_LENGTH = 5000;
const MAX_STRUCTURE_NODES = 10000;
const MAX_PROJECTS = 200;
const MAX_DOCUMENTS_PER_PROJECT = 500;

export function validateWorkspacePayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['body must be a non-null object'] };
  }

  const ws = body.workspace;
  if (!ws || typeof ws !== 'object') {
    return { valid: false, errors: ['workspace must be a non-null object'] };
  }

  if (!Array.isArray(ws.projects)) {
    errors.push('workspace.projects must be an array');
  } else {
    if (ws.projects.length > MAX_PROJECTS) {
      errors.push(`workspace.projects exceeds maximum of ${MAX_PROJECTS}`);
    }
    for (let i = 0; i < ws.projects.length; i++) {
      const p = ws.projects[i];
      if (!p || typeof p !== 'object') {
        errors.push(`projects[${i}]: must be a non-null object`);
        continue;
      }
      if (!p.id || typeof p.id !== 'string') {
        errors.push(`projects[${i}].id: required`);
      }
      if (!p.name || typeof p.name !== 'string') {
        errors.push(`projects[${i}].name: required`);
      } else if (p.name.length > MAX_NAME_LENGTH) {
        errors.push(`projects[${i}].name: exceeds ${MAX_NAME_LENGTH} characters`);
      }
      if (p.description && typeof p.description === 'string' && p.description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push(`projects[${i}].description: exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
      }
      if (p.code && typeof p.code === 'string' && p.code.length > MAX_CODE_LENGTH) {
        errors.push(`projects[${i}].code: exceeds ${MAX_CODE_LENGTH} characters`);
      }
      if (p.companyName && typeof p.companyName === 'string' && p.companyName.length > MAX_COMPANY_NAME_LENGTH) {
        errors.push(`projects[${i}].companyName: exceeds ${MAX_COMPANY_NAME_LENGTH} characters`);
      }
    }
  }

  if (!ws.documents || typeof ws.documents !== 'object' || Array.isArray(ws.documents)) {
    errors.push('workspace.documents must be a non-array object');
  } else {
    const projectIds = Object.keys(ws.documents);
    for (const pid of projectIds) {
      const docs = ws.documents[pid];
      if (!Array.isArray(docs)) {
        errors.push(`documents.${pid}: must be an array`);
        continue;
      }
      if (docs.length > MAX_DOCUMENTS_PER_PROJECT) {
        errors.push(`documents.${pid}: exceeds maximum of ${MAX_DOCUMENTS_PER_PROJECT}`);
      }
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        if (!d || typeof d !== 'object') {
          errors.push(`documents.${pid}[${i}]: must be a non-null object`);
          continue;
        }
        if (!d.id || typeof d.id !== 'string') {
          errors.push(`documents.${pid}[${i}].id: required`);
        }
        if (!d.name || typeof d.name !== 'string') {
          errors.push(`documents.${pid}[${i}].name: required`);
        } else if (d.name.length > MAX_NAME_LENGTH) {
          errors.push(`documents.${pid}[${i}].name: exceeds ${MAX_NAME_LENGTH} characters`);
        }
        if (d.structure && (!Array.isArray(d.structure) || d.structure.length > MAX_STRUCTURE_NODES)) {
          errors.push(`documents.${pid}[${i}].structure: must be an array with max ${MAX_STRUCTURE_NODES} nodes`);
        }
        if (d.formData && (typeof d.formData !== 'object' || Array.isArray(d.formData))) {
          errors.push(`documents.${pid}[${i}].formData: must be a non-array object`);
        }
        if (d.coverData && (typeof d.coverData !== 'object' || Array.isArray(d.coverData))) {
          errors.push(`documents.${pid}[${i}].coverData: must be a non-array object`);
        }
      }
    }
  }

  if (ws.coverConfig && (typeof ws.coverConfig !== 'object' || Array.isArray(ws.coverConfig))) {
    errors.push('workspace.coverConfig must be a non-array object');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

export function validateDeleteId(id, label) {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return `${label}: must be a non-empty string`;
  }
  return null;
}
