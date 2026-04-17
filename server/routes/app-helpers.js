function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function toSafeString(value, fallback = '') {
  if (value == null) return fallback;
  return String(value);
}

function normalizeProject(raw) {
  if (!isRecord(raw)) return null;
  const id = toSafeString(raw.id).trim();
  const name = toSafeString(raw.name).trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    description: toSafeString(raw.description).trim(),
    code: toSafeString(raw.code).trim(),
    accentColor: toSafeString(raw.accentColor || raw.accent_color || '#006399').trim() || '#006399',
    companyName: toSafeString(raw.companyName || raw.company_name).trim(),
    logo: toSafeString(raw.logo).trim(),
    coverPhoto: toSafeString(raw.coverPhoto || raw.cover_photo).trim(),
    coverImageUrl: toSafeString(raw.coverImageUrl || raw.coverPhoto || raw.cover_photo).trim(),
    month: toSafeString(raw.month).trim(),
    year: toSafeString(raw.year).trim(),
    updatedAt: raw.updatedAt || raw.updated_at || null,
    source: raw.source ? toSafeString(raw.source).trim() : undefined,
    workspaceId: raw.workspaceId ?? raw.workspace_id ?? null
  };
}

function normalizeDocument(raw) {
  if (!isRecord(raw)) return null;
  const id = toSafeString(raw.id).trim();
  const name = toSafeString(raw.name).trim();
  const projectId = toSafeString(raw.projectId || raw.project_id).trim();
  if (!id || !name) return null;

  const hasStructure = Array.isArray(raw.structure);
  const hasFormData = isRecord(raw.formData) || isRecord(raw.form_data);
  const hasCoverData = isRecord(raw.coverData) || isRecord(raw.cover_data);
  const contentLoaded = raw.contentLoaded === false ? false : (hasStructure || hasFormData || hasCoverData);

  return {
    id,
    projectId,
    name,
    type: toSafeString(raw.type).trim(),
    description: toSafeString(raw.description).trim(),
    version: raw.version ? toSafeString(raw.version).trim() : undefined,
    updatedAt: raw.updatedAt || raw.updated_at || null,
    source: raw.source ? toSafeString(raw.source).trim() : undefined,
    labels: Array.isArray(raw.labels) ? raw.labels : undefined,
    issueProjectId: raw.issueProjectId ?? raw.issue_project_id ?? null,
    workspaceId: raw.workspaceId ?? raw.workspace_id ?? null,
    automatable: raw.automatable === true,
    planeUpdatedAt: raw.planeUpdatedAt || raw.plane_updated_at || null,
    structure: hasStructure ? raw.structure : [],
    formData: isRecord(raw.formData) ? raw.formData : (isRecord(raw.form_data) ? raw.form_data : {}),
    coverData: isRecord(raw.coverData) ? raw.coverData : (isRecord(raw.cover_data) ? raw.cover_data : {}),
    contentLoaded
  };
}

function normalizeCoverConfig(raw) {
  if (!isRecord(raw)) return {};

  const projectData = isRecord(raw.projectData) ? raw.projectData : {};
  const projectVariables = Array.isArray(raw.projectVariables)
    ? raw.projectVariables
        .filter(isRecord)
        .map((item) => ({
          key: toSafeString(item.key).trim(),
          value: item.value ?? '',
          label: toSafeString(item.label).trim(),
          type: toSafeString(item.type || 'text').trim() || 'text'
        }))
        .filter((item) => item.key)
    : [];

  return {
    companyName: toSafeString(raw.companyName).trim(),
    logo: toSafeString(raw.logo).trim(),
    coverPhoto: toSafeString(raw.coverPhoto).trim(),
    month: toSafeString(raw.month).trim(),
    year: toSafeString(raw.year).trim(),
    primaryColor: toSafeString(raw.primaryColor || '#006399').trim() || '#006399',
    projectData,
    projectVariables
  };
}

export function parseWorkspace(raw) {
  if (!isRecord(raw)) return null;

  const projects = Array.isArray(raw.projects) ? raw.projects.map(normalizeProject).filter(Boolean) : [];
  const documents = isRecord(raw.documents)
    ? Object.fromEntries(
        Object.entries(raw.documents).map(([projectId, docs]) => [
          String(projectId),
          Array.isArray(docs) ? docs.map((doc) => normalizeDocument({ ...doc, projectId })).filter(Boolean) : []
        ])
      )
    : {};
  const coverConfig = isRecord(raw.coverConfig)
    ? Object.fromEntries(Object.entries(raw.coverConfig).map(([projectId, cfg]) => [String(projectId), normalizeCoverConfig(cfg)]))
    : {};

  return { projects, documents, coverConfig };
}

export function parseDocumentPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const projectId = String(raw.projectId || '').trim();
  const documentId = String(raw.documentId || '').trim();
  if (!projectId || !documentId) return null;
  return {
    projectId,
    documentId,
    documentName: String(raw.documentName || '').trim(),
    structure: Array.isArray(raw.structure) ? raw.structure : [],
    formData: raw.formData && typeof raw.formData === 'object' && !Array.isArray(raw.formData) ? raw.formData : {},
    coverData: raw.coverData && typeof raw.coverData === 'object' && !Array.isArray(raw.coverData) ? raw.coverData : {}
  };
}

export function parseTemplatePayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const slug = String(raw.slug || '').trim();
  const name = String(raw.name || '').trim();
  const description = String(raw.description || '').trim();
  const data = Array.isArray(raw.data) ? raw.data : null;
  if (!slug || !name || !data) return null;
  return { slug, name, description, data };
}

export function normalizeTemplateRow(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    data: Array.isArray(row.data) ? row.data : [],
    isSystem: Boolean(row.is_system),
    updatedAt: row.updated_at
  };
}
