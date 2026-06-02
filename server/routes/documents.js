import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { generateDocumentLatex } from '../document-export.js';
import { getDocumentLock, isLockExpired, normalizeLock, purgeExpiredLock } from '../services/document-locks.js';
import { parseDocumentPayload } from './app-helpers.js';
import { materializePayloadAssets } from '../services/pdf-assets.js';
import { loadDocumentState } from '../workspace-store.js';
// import { mergePdfFiles, renderHtmlCoverPdf } from '../services/html-cover.js';

const execFileAsync = promisify(execFile);

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

function extractLatexErrorMessage(output) {
  const raw = String(output || '');
  const latexError = raw.match(/! LaTeX Error:\s+([^\n]+)/);
  if (latexError?.[1]) return latexError[1].trim();

  const emergency = raw.match(/! Emergency stop\.[\s\S]*?l\.\d+\s+([^\n]+)/);
  if (emergency?.[1]) return emergency[1].trim();

  return '';
}

async function loadOwnedDocument(appPool, userId, projectId, documentId) {
  const result = await appPool.query(
    'SELECT id FROM app_documents WHERE id = $1 AND project_id = $2 AND user_id = $3 LIMIT 1',
    [documentId, projectId, userId]
  );
  return result.rows[0] || null;
}

export function registerDocumentRoutes(app, deps) {
  const { appPool, authRequired, authOptionalInDev, config } = deps;

  app.get('/api/projects/:projectId/documents/:documentId', authRequired, async (req, res) => {
    const projectId = String(req.params.projectId || '').trim();
    const documentId = String(req.params.documentId || '').trim();

    if (!projectId || !documentId) {
      res.status(400).json({ error: 'Proyecto o documento invalido.' });
      return;
    }

    try {
      const document = await loadDocumentState(appPool, req.auth.userId, projectId, documentId);
      if (!document) {
        res.status(404).json({ error: 'Documento no encontrado.' });
        return;
      }

      const version = document.updatedAt ? new Date(document.updatedAt).getTime() : 0;
      const etag = `W/"document-${documentId}-${version}"`;
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, must-revalidate');
      res.json({ ok: true, document });
    } catch (error) {
      console.error('document_get_error', error);
      res.status(500).json({ error: 'No se pudo leer el documento.' });
    }
  });

  app.get('/api/documents/:projectId/:documentId/lock', authRequired, async (req, res) => {
    const projectId = String(req.params.projectId || '').trim();
    const documentId = String(req.params.documentId || '').trim();

    try {
      const document = await loadOwnedDocument(appPool, req.auth.userId, projectId, documentId);
      if (!document) {
        res.status(404).json({ error: 'Documento no encontrado.' });
        return;
      }

      await purgeExpiredLock(appPool, documentId);
      const lock = await getDocumentLock(appPool, documentId);
      res.json({ ok: true, lock: normalizeLock(lock, req.auth.userId) });
    } catch (error) {
      console.error('document_lock_get_error', error);
      res.status(500).json({ error: 'No se pudo leer el lock del documento.' });
    }
  });

  app.post('/api/documents/:projectId/:documentId/lock', authRequired, async (req, res) => {
    const projectId = String(req.params.projectId || '').trim();
    const documentId = String(req.params.documentId || '').trim();
    const token = String(req.body?.token || randomUUID());

    try {
      const document = await loadOwnedDocument(appPool, req.auth.userId, projectId, documentId);
      if (!document) {
        // Retornamos 200 pero con ok: false para evitar que el navegador lo marque como error (rojo) en la consola
        // ya que esto es común para documentos nuevos que aún no han sido autosavdeados.
        res.json({
          ok: false,
          notInDb: true,
          error: 'Documento no persistido aún o no pertenece al usuario.'
        });
        return;
      }

      await purgeExpiredLock(appPool, documentId);
      const currentLock = await getDocumentLock(appPool, documentId);

      if (
        currentLock &&
        !isLockExpired(currentLock) &&
        Number(currentLock.user_id) !== req.auth.userId &&
        currentLock.token !== token
      ) {
        res.status(409).json({
          ok: false,
          error: 'El documento ya está siendo editado por otro usuario.',
          lock: normalizeLock(currentLock, req.auth.userId, token)
        });
        return;
      }

      await appPool.query(
        `INSERT INTO app_document_locks (document_id, user_id, token, expires_at, updated_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '90 seconds', NOW())
         ON CONFLICT (document_id)
         DO UPDATE SET user_id = EXCLUDED.user_id, token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
        [documentId, req.auth.userId, token]
      );

      const nextLock = await getDocumentLock(appPool, documentId);
      res.json({ ok: true, token, lock: normalizeLock(nextLock, req.auth.userId, token) });
    } catch (error) {
      console.error('document_lock_acquire_error', error);
      res.status(500).json({ error: 'No se pudo adquirir el lock del documento.' });
    }
  });

  app.post('/api/documents/:projectId/:documentId/lock/heartbeat', authRequired, async (req, res) => {
    const projectId = String(req.params.projectId || '').trim();
    const documentId = String(req.params.documentId || '').trim();
    const token = String(req.body?.token || '').trim();

    try {
      const document = await loadOwnedDocument(appPool, req.auth.userId, projectId, documentId);
      if (!document) {
        res.status(404).json({ error: 'Documento no encontrado.' });
        return;
      }

      const result = await appPool.query(
        `UPDATE app_document_locks
         SET expires_at = NOW() + INTERVAL '90 seconds', updated_at = NOW()
         WHERE document_id = $1 AND user_id = $2 AND token = $3
         RETURNING document_id, user_id, token, created_at, updated_at, expires_at`,
        [documentId, req.auth.userId, token]
      );

      const lock = result.rows[0];
      if (result.rowCount === 0) {
        // Retornamos 200 con ok: false para evitar error rojo en consola.
        // El cliente detectara ok: false y tratara de re-adquirir.
        res.json({ ok: false, lost: true, error: 'El lock ya no pertenece a esta sesión.' });
        return;
      }

      const hydrated = await getDocumentLock(appPool, documentId);
      res.json({ ok: true, lock: normalizeLock(hydrated, req.auth.userId, token) });
    } catch (error) {
      console.error('document_lock_heartbeat_error', error);
      res.status(500).json({ error: 'No se pudo refrescar el lock del documento.' });
    }
  });

  app.delete('/api/documents/:projectId/:documentId/lock', authRequired, async (req, res) => {
    const projectId = String(req.params.projectId || '').trim();
    const documentId = String(req.params.documentId || '').trim();
    const token = String(req.body?.token || req.query?.token || '').trim();

    try {
      const document = await loadOwnedDocument(appPool, req.auth.userId, projectId, documentId);
      if (!document) {
        res.status(404).json({ error: 'Documento no encontrado.' });
        return;
      }

      await appPool.query(
        "DELETE FROM app_document_locks WHERE document_id = $1 AND user_id = $2 AND ($3 = '' OR token = $3)",
        [documentId, req.auth.userId, token]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error('document_lock_release_error', error);
      res.status(500).json({ error: 'No se pudo liberar el lock del documento.' });
    }
  });

  app.post('/api/documents/export/tex', authOptionalInDev, async (req, res) => {
    const payload = parseDocumentPayload(req.body?.document);
    if (!payload) {
      res.status(400).json({ error: 'document invalido.' });
      return;
    }

    const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'autotext-tex-'));
    const texPath = path.join(workdir, 'document.tex');
    const zipPath = path.join(workdir, `${payload.documentId || 'documento'}.zip`);

    try {
      const normalizedPayload = await materializePayloadAssets(config, payload, workdir);
      const tex = generateDocumentLatex(normalizedPayload);
      await fs.writeFile(texPath, tex, 'utf8');

      const assetEntries = (await fs.readdir(workdir)).filter((entry) => entry !== path.basename(zipPath));
      await execFileAsync('zip', ['-q', '-r', path.basename(zipPath), ...assetEntries], {
        cwd: workdir,
        timeout: 60000
      });

      const zipBuffer = await fs.readFile(zipPath);
      const texName = `${sanitizeFilename(payload.documentName)}-${String(payload.documentId || '').slice(0, 8)}`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${texName}.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error('document_export_tex_error', error);
      res.status(500).json({ error: 'No se pudo generar el paquete TEX.' });
    } finally {
      await fs.rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });

  app.post('/api/documents/export/pdf', authOptionalInDev, async (req, res) => {
    const payload = parseDocumentPayload(req.body?.document);
    if (!payload) {
      res.status(400).json({ error: 'document invalido.' });
      return;
    }

    const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'autotext-pdf-'));
    const texPath = path.join(workdir, 'document.tex');
    const pdfPath = path.join(workdir, 'document.pdf');
    // const coverPdfPath = path.join(workdir, 'cover.pdf');
    let compiledSuccessfully = false;

    try {
      const normalizedPayload = await materializePayloadAssets(config, payload, workdir);
      const tex = generateDocumentLatex(normalizedPayload);
      await fs.writeFile(texPath, tex, 'utf8');

      // Verify xelatex is available
      try {
        await execFileAsync('which', ['xelatex'], { timeout: 5000 });
      } catch {
        throw Object.assign(new Error('xelatex no está instalado en el servidor.'), { code: 'ENOENT' });
      }

      await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', 'document.tex'], {
        cwd: workdir,
        timeout: 120000
      });
      await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', 'document.tex'], {
        cwd: workdir,
        timeout: 120000
      });

      // Caratula HTML desactivada temporalmente.
      // await renderHtmlCoverPdf(normalizedPayload, workdir, coverPdfPath);
      // const pdfBuffer = await mergePdfFiles([coverPdfPath, pdfPath]);
      const pdfBuffer = await fs.readFile(pdfPath);
      compiledSuccessfully = true;
      const pdfName = `${sanitizeFilename(payload.documentName)}-${String(payload.documentId || '').slice(0, 8)}`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfName}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      const logPath = path.join(workdir, 'document.log');
      let latexLog = '';
      try {
        latexLog = await fs.readFile(logPath, 'utf8');
      } catch {}
      const latexDetail = extractLatexErrorMessage(error?.stdout || error?.stderr);
      let logTail = '';
      try {
        logTail = latexLog ? latexLog.slice(-4000) : '';
      } catch {}
      console.error('document_export_pdf_error', {
        code: error?.code,
        message: error?.message,
        workdir,
        texPath,
        logPath,
        latexDetail,
        stdout: typeof error?.stdout === 'string' ? error.stdout.slice(-2000) : '',
        stderr: typeof error?.stderr === 'string' ? error.stderr.slice(-2000) : '',
        logTail
      });

      if (error?.code === 'ENOENT') {
        res.status(503).json({ error: 'xelatex no está instalado en el servidor. Verifica la instalación de TeX Live.' });
        return;
      }

      if (error?.code === 'ETIMEDOUT' || String(error?.message || '').includes('timed out')) {
        res.status(504).json({ error: 'La compilación del PDF excedió el tiempo máximo. El documento puede ser demasiado extenso.' });
        return;
      }

      if (latexDetail) {
        res.status(500).json({
          error: `Error de compilación LaTeX: ${latexDetail}`,
          detail: 'Revisa que el documento no contenga caracteres especiales no soportados.'
        });
        return;
      }

      res.status(500).json({
        error: 'No se pudo compilar el PDF.',
        detail: error?.message || 'Error desconocido durante la generación.'
      });
    } finally {
      if (process.env.KEEP_FAILED_PDF_EXPORTS === '1') {
        try {
          if (!compiledSuccessfully) {
            return;
          }
          await fs.access(pdfPath);
          await fs.rm(workdir, { recursive: true, force: true });
        } catch {}
      } else {
        await fs.rm(workdir, { recursive: true, force: true }).catch(() => {});
      }
    }
  });
}
