import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { appPool } from './server/db.js';
import { generateDocumentLatex } from './server/document-export.js';

const execFileAsync = promisify(execFile);

async function testCompilation() {
  const workdir = './tmp_test_latex';
  await fs.mkdir(workdir, { recursive: true });
  
  try {
    const res = await appPool.query(
      "SELECT name, structure, form_data, cover_data FROM app_documents WHERE name ILIKE '%ficha%' LIMIT 1"
    );
    
    if (res.rows.length === 0) {
      console.error('No se encontró la ficha');
      process.exit(1);
    }

    const doc = res.rows[0];
    const tex = generateDocumentLatex({
      documentName: doc.name,
      structure: doc.structure,
      formData: doc.form_data,
      coverData: doc.cover_data
    });

    const texPath = path.join(workdir, 'test.tex');
    await fs.writeFile(texPath, tex, 'utf8');
    console.log('Archivo TEX generado en:', texPath);

    console.log('Iniciando compilación con xelatex...');
    const { stdout, stderr } = await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', 'test.tex'], {
      cwd: workdir,
      timeout: 30000
    });
    
    console.log('Compilación exitosa');
    process.exit(0);
  } catch (error) {
    console.error('ERROR DE COMPILACIÓN:');
    console.error(error.stdout || error.message);
    
    const logPath = path.join(workdir, 'test.log');
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      console.log('\n--- ÚLTIMAS LÍNEAS DEL LOG ---');
      console.log(logContent.slice(-2000));
    } catch (e) {
      console.error('No se pudo leer el archivo log');
    }
    process.exit(1);
  }
}

testCompilation();
