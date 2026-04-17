import fs from 'node:fs';
import { config } from './config.js';
import { queryPlaneDb } from './db.js';
import { resolveProjectCoverUrl, toAbsolutePlaneUrl } from './services/plane-api.js';

function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value || '');
}

function isNonEmptyObject(value) {
  return isRecord(value) && Object.keys(value).length > 0;
}

function isNonEmptyStructure(value) {
  return Array.isArray(value) && value.length > 0;
}

function shouldPreserveExistingDocument(existingDoc, incomingDoc) {
  if (!existingDoc) return false;
  const existingHasContent = isNonEmptyStructure(existingDoc.structure) || isNonEmptyObject(existingDoc.form_data) || isNonEmptyObject(existingDoc.cover_data);
  if (!existingHasContent) return false;
  const incomingStructure = Array.isArray(incomingDoc?.structure) ? incomingDoc.structure : [];
  const incomingFormData = isRecord(incomingDoc?.formData) ? incomingDoc.formData : {};
  const incomingCoverData = isRecord(incomingDoc?.coverData) ? incomingDoc.coverData : {};
  return !isNonEmptyStructure(incomingStructure) && !isNonEmptyObject(incomingFormData) && !isNonEmptyObject(incomingCoverData);
}

function getObjectSize(value) { return isRecord(value) ? Object.keys(value).length : 0; }

function getProjectVariableCount(coverConfig = {}) {
  return Object.values(coverConfig).reduce((sum, cfg) => sum + getObjectSize(cfg?.projectData), 0);
}

function getDocumentContentMetrics(documents = {}) {
  const metrics = { documentCount: 0, structuredDocumentCount: 0, formFieldCount: 0, coverFieldCount: 0 };
  Object.values(documents).forEach((projectDocs) => {
    if (!Array.isArray(projectDocs)) return;
    projectDocs.forEach((doc) => {
      metrics.documentCount += 1;
      if (Array.isArray(doc?.structure) && doc.structure.length > 0) metrics.structuredDocumentCount += 1;
      metrics.formFieldCount += getObjectSize(doc?.formData ?? doc?.form_data);
      metrics.coverFieldCount += getObjectSize(doc?.coverData ?? doc?.cover_data);
    });
  });
  return metrics;
}

function getWorkspaceMetrics(workspace = {}) {
  const projects = Array.isArray(workspace.projects) ? workspace.projects : [];
  const documents = isRecord(workspace.documents) ? workspace.documents : {};
  const coverConfig = isRecord(workspace.coverConfig) ? workspace.coverConfig : {};
  return { projectCount: projects.length, projectVariableCount: getProjectVariableCount(coverConfig), ...getDocumentContentMetrics(documents) };
}

function shouldProtectAgainstSparseSave(existingMetrics, incomingMetrics) {
  if (!existingMetrics.projectCount) return false;
  if (incomingMetrics.projectCount === 0) return true;
  if (existingMetrics.documentCount > 0 && incomingMetrics.documentCount === 0) return true;
  if (existingMetrics.structuredDocumentCount > 0 && incomingMetrics.structuredDocumentCount === 0) return true;
  if (existingMetrics.formFieldCount > 0 && incomingMetrics.formFieldCount === 0) return true;
  if (existingMetrics.projectVariableCount > 0 && incomingMetrics.projectVariableCount === 0) return true;
  return false;
}

function mergeProjectData(existingProjectData, incomingProjectData, protectSparseSave) {
  if (!protectSparseSave) return isRecord(incomingProjectData) ? incomingProjectData : {};
  return { ...(isRecord(existingProjectData) ? existingProjectData : {}), ...(isRecord(incomingProjectData) ? incomingProjectData : {}) };
}

function mergeCoverData(existingCoverData, incomingCoverData, protectSparseSave) {
  const incoming = isRecord(incomingCoverData) ? incomingCoverData : {};
  if (!protectSparseSave) return incoming;
  const existing = isRecord(existingCoverData) ? existingCoverData : {};
  return { ...existing, ...incoming, projectData: { ...(isRecord(existing.projectData) ? existing.projectData : {}), ...(isRecord(incoming.projectData) ? incoming.projectData : {}) } };
}

function getExistingDocStructure(doc) { return Array.isArray(doc?.structure) ? doc.structure : []; }
function getExistingDocFormData(doc) { return isRecord(doc?.form_data) ? doc.form_data : (isRecord(doc?.formData) ? doc.formData : {}); }
function getExistingDocCoverData(doc) { return isRecord(doc?.cover_data) ? doc.cover_data : (isRecord(doc?.coverData) ? doc.coverData : {}); }

function normalizeProjectRow(row) {
  const updatedAt = row.updated_at || row.updatedAt || null;
  const logo = row.logo?.startsWith('data:') ? `/api/projects/${row.id}/logo?v=${new Date(updatedAt).getTime()}` : (row.logo || '');
  const coverPhoto = row.coverPhoto?.startsWith('data:')
    ? `/api/projects/${row.id}/cover?v=${new Date(updatedAt).getTime()}`
    : (row.coverPhoto || '');

  return {
    ...row,
    logo,
    coverPhoto,
    coverImageUrl: coverPhoto
  };
}

function toDocumentSummary(row) {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    type: row.type,
    description: row.description || '',
    updatedAt: row.updated_at || row.updatedAt || null,
    contentLoaded: false
  };
}

function toDocumentDetail(row) {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    type: row.type,
    description: row.description || '',
    structure: Array.isArray(row.structure) ? row.structure : [],
    formData: isRecord(row.formData) ? row.formData : {},
    coverData: isRecord(row.coverData) ? row.coverData : {},
    updatedAt: row.updated_at || row.updatedAt || null,
    contentLoaded: true
  };
}

async function loadExistingWorkspaceForSave(client, userId) {
  const [projectsRes, varsRes, docsRes] = await Promise.all([
    client.query('SELECT id, name, description, code, accent_color as "accentColor", company_name as "companyName", logo, cover_photo as "coverPhoto", month, year, updated_at FROM app_projects WHERE user_id = $1', [userId]),
    client.query('SELECT project_id as "projectId", variable_key as "key", variable_value as "value", variable_label as "label", variable_type as "type" FROM app_project_variables apv JOIN app_projects ap ON ap.id = apv.project_id WHERE ap.user_id = $1', [userId]),
    client.query('SELECT id, project_id as "projectId", name, type, description, structure, form_data as "formData", cover_data as "coverData", updated_at FROM app_documents WHERE project_id IN (SELECT id FROM app_projects WHERE user_id = $1)', [userId])
  ]);
  const coverConfig = {};
  projectsRes.rows.forEach((p) => {
    coverConfig[p.id] = { companyName: p.companyName || '', logo: p.logo || '', coverPhoto: p.coverPhoto || '', month: p.month || '', year: p.year || '', primaryColor: p.accentColor || '#006399', projectData: {}, projectVariables: [] };
  });
  varsRes.rows.forEach((row) => {
    if (!coverConfig[row.projectId]) coverConfig[row.projectId] = { projectData: {}, projectVariables: [] };
    coverConfig[row.projectId].projectData[row.key] = row.value;
    coverConfig[row.projectId].projectVariables.push({ key: row.key, value: row.value, label: row.label || '', type: row.type || 'text' });
  });
  const documents = {};
  docsRes.rows.forEach((doc) => {
    if (!documents[doc.projectId]) documents[doc.projectId] = [];
    documents[doc.projectId].push(doc);
  });
  return { workspace: { projects: projectsRes.rows, documents, coverConfig }, projectsById: new Map(projectsRes.rows.map((p) => [String(p.id), p])), documentsById: new Map(docsRes.rows.map((d) => [String(d.id), d])) };
}

const imageCache = new Map();

async function ensureBase64(url) {
  if (!url || typeof url !== 'string' || url.startsWith('data:image') || url.startsWith('/api/projects/')) return url || '';
  if (!url.startsWith('/api/plane/assets/')) return url;
  
  if (imageCache.has(url)) return imageCache.get(url);

  const assetId = url.split('/').pop();
  if (!assetId || assetId.length < 10) return url;
  const absoluteUrl = `${config.planeBaseUrl}/api/assets/v2/static/${assetId}/`;
  try {
    const res = await fetch(absoluteUrl, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return url;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';
    const b64 = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
    imageCache.set(url, b64);
    if (imageCache.size > 100) imageCache.delete(imageCache.keys().next().value);
    return b64;
  } catch { return url; }
}

async function syncDocumentNodes(client, documentId, structure) {
  const existingRes = await client.query('SELECT id FROM app_document_nodes WHERE document_id::text = $1::text', [documentId]);
  const existingIds = new Set(existingRes.rows.map(r => r.id));
  const incomingIds = new Set();
  const saveNode = async (node, parentId, position) => {
    if (!node.id) return;
    incomingIds.add(node.id);
    await client.query(`INSERT INTO app_document_nodes (id, document_id, parent_id, node_type, content, config, ordinal_position, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT (id) DO UPDATE SET parent_id = EXCLUDED.parent_id, node_type = EXCLUDED.node_type, content = EXCLUDED.content, config = EXCLUDED.config, ordinal_position = EXCLUDED.ordinal_position, updated_at = NOW()`, [node.id, documentId, parentId, node.type || 'paragraph', node.content || '', JSON.stringify({ ...node, id: undefined, type: undefined, content: undefined, children: undefined }), position]);
    if (Array.isArray(node.children)) { for (let i = 0; i < node.children.length; i++) await saveNode(node.children[i], node.id, i); }
  };
  for (let i = 0; i < (structure || []).length; i++) await saveNode(structure[i], null, i);
  const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
  if (toDelete.length > 0) await client.query('DELETE FROM app_document_nodes WHERE id::text = ANY($1::text[])', [toDelete]);
}

async function syncDocumentValues(client, documentId, formData) {
  const entries = Object.entries(formData || {});
  if (entries.length === 0) return;
  for (const [key, value] of entries) { await client.query(`INSERT INTO app_document_values (document_id, field_key, field_value) VALUES ($1, $2, $3) ON CONFLICT (document_id, field_key) DO UPDATE SET field_value = EXCLUDED.field_value`, [documentId, key, String(value ?? '')]); }
  await client.query('DELETE FROM app_document_values WHERE document_id::text = $1::text AND NOT (field_key = ANY($2::text[]))', [documentId, entries.map(([k]) => k)]);
}

async function syncProjectBlock(client, projectId, blockId, blockData) {
  const config = { ...blockData.nodeProps };
  if (blockData.type !== 'table') config.formData = blockData.formData;
  await client.query(`INSERT INTO app_project_blocks (id, project_id, name, block_type, config, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, block_type = EXCLUDED.block_type, config = EXCLUDED.config, updated_at = NOW()`, [blockId, projectId, config.label || blockId, blockData.type || 'table', JSON.stringify(config)]);
  if (blockData.type === 'table' && blockData.formData?.rows) {
    const rows = blockData.formData.rows;
    const allKeys = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => { if(k !== 'id') allKeys.add(k); }));
    const sortedKeys = Array.from(allKeys).sort();
    for (let i = 0; i < sortedKeys.length; i++) { await client.query(`INSERT INTO app_block_table_columns (block_id, column_key, label, ordinal_position) VALUES ($1, $2, $3, $4) ON CONFLICT (block_id, column_key) DO UPDATE SET label = EXCLUDED.label`, [blockId, sortedKeys[i], sortedKeys[i].replace('col_', 'Columna '), i]); }
    await client.query('DELETE FROM app_block_table_rows WHERE block_id::text = $1::text', [blockId]);
    for (let i = 0; i < rows.length; i++) {
      const rowRes = await client.query('INSERT INTO app_block_table_rows (block_id, ordinal_position) VALUES ($1, $2) RETURNING id', [blockId, i]);
      for (const k of sortedKeys) { await client.query('INSERT INTO app_block_table_cells (row_id, column_key, cell_value) VALUES ($1, $2, $3)', [rowRes.rows[0].id, k, String(rows[i][k] ?? '')]); }
    }
  }
}

export async function loadWorkspaceState(appPool, userId, options = {}) {
  const { includeDocumentContent = false } = options;
  console.time(`load_workspace_${userId}`);
  const [projectsRes, docsRes, varsRes] = await Promise.all([
    appPool.query('SELECT id, name, description, code, accent_color as "accentColor", company_name as "companyName", logo, cover_photo as "coverPhoto", cover_photo as "coverImageUrl", month, year, updated_at FROM app_projects WHERE user_id = $1', [userId]),
    appPool.query('SELECT id, project_id as "projectId", name, type, description, structure, form_data as "formData", cover_data as "coverData", updated_at FROM app_documents WHERE project_id IN (SELECT id FROM app_projects WHERE user_id = $1)', [userId]),
    appPool.query('SELECT project_id as "projectId", variable_key as "key", variable_value as "value", variable_label as "label", variable_type as "type" FROM app_project_variables WHERE project_id IN (SELECT id FROM app_projects WHERE user_id = $1)', [userId])
  ]);
  const coverConfig = {};
  const normalizedProjects = projectsRes.rows.map(normalizeProjectRow);
  normalizedProjects.forEach((p) => {
    coverConfig[p.id] = { companyName: p.companyName || '', logo: p.logo || '', coverPhoto: p.coverPhoto || '', month: p.month || '', year: p.year || '', primaryColor: p.accentColor || '#006399', projectData: {}, projectVariables: [] };
  });
  const documents = {};
  docsRes.rows.forEach((row) => {
    if (!documents[row.projectId]) documents[row.projectId] = [];
    documents[row.projectId].push(includeDocumentContent ? toDocumentDetail(row) : toDocumentSummary(row));
  });
  varsRes.rows.forEach((row) => { const cfg = coverConfig[row.projectId]; if (cfg) { cfg.projectData[row.key] = row.value; cfg.projectVariables.push({ key: row.key, value: row.value, label: row.label || '', type: row.type || 'text' }); } });
  console.timeEnd(`load_workspace_${userId}`);
  return {
    workspace: { projects: normalizedProjects, documents, coverConfig },
    updatedAt: docsRes.rows.reduce((max, r) => (max > r.updated_at ? max : r.updated_at), projectsRes.rows[0]?.updated_at)
  };
}

export async function loadDocumentState(appPool, userId, projectId, documentId) {
  const result = await appPool.query(
    `SELECT id, project_id as "projectId", name, type, description, structure, form_data as "formData", cover_data as "coverData", updated_at
     FROM app_documents
     WHERE id = $1 AND project_id = $2 AND user_id = $3
     LIMIT 1`,
    [documentId, projectId, userId]
  );

  const row = result.rows[0];
  if (!row) return null;
  return toDocumentDetail(row);
}

export async function saveWorkspaceState(appPool, userId, rawWorkspace, options = {}) {
  const { projects = [], documents = {}, coverConfig = {} } = rawWorkspace;
  const { changedProjectId = null } = options;
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), 0)', [String(userId)]);
    
    let existingWS = null;
    let protectSparse = false;
    if (!changedProjectId) {
      existingWS = await loadExistingWorkspaceForSave(client, userId);
      protectSparse = shouldProtectAgainstSparseSave(getWorkspaceMetrics(existingWS.workspace), getWorkspaceMetrics({ projects, documents, coverConfig }));
    } else {
      existingWS = await loadExistingWorkspaceForSave(client, userId);
    }

    const projectsToSync = changedProjectId ? projects.filter(p => String(p.id) === String(changedProjectId)) : projects;
    for (const p of projectsToSync) {
      const cfg = coverConfig[p.id] || {};
      const processImg = async (val) => (val?.startsWith('data:image/') || val?.startsWith('/api/projects/')) ? val : await ensureBase64(val);
      
      await client.query(`INSERT INTO app_projects (id, user_id, name, description, code, accent_color, company_name, logo, cover_photo, month, year, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, code = EXCLUDED.code, accent_color = EXCLUDED.accent_color, company_name = EXCLUDED.company_name, logo = COALESCE(NULLIF(EXCLUDED.logo, ''), app_projects.logo), cover_photo = COALESCE(NULLIF(EXCLUDED.cover_photo, ''), app_projects.cover_photo), month = EXCLUDED.month, year = EXCLUDED.year, updated_at = NOW()`, [p.id, userId, p.name, p.description || '', p.code || '', cfg.primaryColor || p.accentColor || '#006399', cfg.companyName || '', await processImg(cfg.logo || ''), await processImg(cfg.coverPhoto || p.coverImageUrl || ''), cfg.month || '', cfg.year || '']);
      
      const projectData = cfg.projectData || {};
      for (const [vKey, vValue] of Object.entries(projectData)) {
        const meta = (cfg.projectVariables || []).find(v => v.key === vKey) || { type: 'text', label: '' };
        if (meta.type === 'block') { try { await syncProjectBlock(client, p.id, vKey, typeof vValue === 'string' ? JSON.parse(vValue) : vValue); } catch (e) {} }
        await client.query(`INSERT INTO app_project_variables (project_id, variable_key, variable_value, variable_label, variable_type, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (project_id, variable_key) DO UPDATE SET variable_value = EXCLUDED.variable_value, variable_label = EXCLUDED.variable_label, variable_type = EXCLUDED.variable_type, updated_at = NOW()`, [p.id, vKey, String(vValue ?? ''), meta.label || '', meta.type || 'text']);
      }
    }
    for (const [projId, projDocs] of Object.entries(documents)) {
      if (changedProjectId && String(projId) !== String(changedProjectId)) continue;
      for (const d of projDocs) {
        const existingDoc = existingWS?.documentsById?.get(String(d.id)) || null;
        const preserveExisting = shouldPreserveExistingDocument(existingDoc, d);
        const nextStructure = preserveExisting ? getExistingDocStructure(existingDoc) : (Array.isArray(d.structure) ? d.structure : []);
        const nextFormData = preserveExisting
          ? getExistingDocFormData(existingDoc)
          : (isRecord(d.formData) ? d.formData : {});
        const nextCoverData = preserveExisting
          ? mergeCoverData(getExistingDocCoverData(existingDoc), d.coverData, true)
          : (isRecord(d.coverData) ? d.coverData : {});

        await client.query(`INSERT INTO app_documents (id, project_id, user_id, name, type, description, structure, form_data, cover_data, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, description = EXCLUDED.description, structure = EXCLUDED.structure, form_data = EXCLUDED.form_data, cover_data = EXCLUDED.cover_data, updated_at = NOW()`, [d.id, projId, userId, d.name, d.type, d.description || '', JSON.stringify(nextStructure), JSON.stringify(nextFormData), JSON.stringify(nextCoverData)]);

        if (!preserveExisting) {
          await syncDocumentNodes(client, d.id, nextStructure);
          await syncDocumentValues(client, d.id, nextFormData);
        }
      }
    }
    await client.query('COMMIT'); return { updatedAt: new Date().toISOString() };
  } catch (err) { if (client) await client.query('ROLLBACK').catch(() => {}); throw err; } finally { if (client) client.release(); }
}
