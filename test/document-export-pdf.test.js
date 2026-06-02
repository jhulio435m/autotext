import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { generateDocumentLatex } from '../server/document-export.js';

const execFileAsync = promisify(execFile);

test('generateDocumentLatex compiles with pdflatex for a basic document', async (t) => {
  try {
    await execFileAsync('xelatex', ['--version']);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      t.skip('xelatex no está disponible en este entorno');
      return;
    }
    throw error;
  }

  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'autotext-pdf-test-'));
  t.after(async () => {
    await fs.rm(workdir, { recursive: true, force: true }).catch(() => {});
  });

  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Contenido',
        children: [
          {
            id: 'var_1',
            isStructure: false,
            type: 'text',
            label: 'Resumen',
            content: 'Texto base'
          }
        ]
      }
    ],
    formData: {},
    coverData: {}
  });

  await fs.writeFile(path.join(workdir, 'document.tex'), tex, 'utf8');
  await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', 'document.tex'], {
    cwd: workdir,
    timeout: 60000
  });

  const pdf = await fs.readFile(path.join(workdir, 'document.pdf'));
  assert.ok(pdf.length > 0);
});
