import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import dotenv from 'dotenv';
import { generateDocumentLatex } from '../server/document-export.js';
import { materializePayloadAssets } from '../server/services/pdf-assets.js';
import { config } from '../server/config.js';

const execFileAsync = promisify(execFile);

dotenv.config({ path: './server/.env' });

const docId = process.argv[2];
if (!docId) {
  console.error('Usage: node scripts/export-real-doc.mjs <document-id>');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.APP_DB_HOST,
  port: Number(process.env.APP_DB_PORT),
  user: process.env.APP_DB_USER,
  password: process.env.APP_DB_PASSWORD,
  database: process.env.APP_DB_NAME
});

try {
  const docRes = await pool.query(
    'select id, project_id as "projectId", name, structure, form_data as "formData", cover_data as "coverData" from app_documents where id = $1',
    [docId]
  );

  const doc = docRes.rows[0];
  if (!doc) {
    throw new Error(`Document not found: ${docId}`);
  }

  const projectRes = await pool.query(
    'select id, name, accent_color as "primaryColor", company_name as "companyName", logo, cover_photo as "coverPhoto", month, year from app_projects where id = $1',
    [doc.projectId]
  );

  const varsRes = await pool.query(
    'select variable_key as key, variable_value as value from app_project_variables where project_id = $1',
    [doc.projectId]
  );

  const project = projectRes.rows[0] || {};
  const projectData = Object.fromEntries(varsRes.rows.map((row) => [row.key, row.value]));

  const payload = {
    projectId: doc.projectId,
    documentId: doc.id,
    documentName: doc.name,
    structure: Array.isArray(doc.structure) ? doc.structure : [],
    formData: doc.formData || {},
    coverData: {
      ...(doc.coverData || {}),
      ...project,
      projectData
    }
  };

  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'autotext-real-export-'));
  const normalized = await materializePayloadAssets(config, payload, workdir);
  const tex = generateDocumentLatex(normalized);

  await fs.writeFile(path.join(workdir, 'document.tex'), tex, 'utf8');
  await fs.writeFile(path.join(workdir, 'payload.json'), JSON.stringify(normalized, null, 2), 'utf8');

  await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', 'document.tex'], {
    cwd: workdir,
    timeout: 120000
  });
  await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', 'document.tex'], {
    cwd: workdir,
    timeout: 120000
  });

  console.log(workdir);
} finally {
  await pool.end();
}
