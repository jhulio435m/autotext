import { config } from '../config.js';
import { queryPlaneDb, appPool } from '../db.js';
import { resolveProjectCoverUrl, toAbsolutePlaneUrl } from './plane-api.js';

async function ensureBase64(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:image')) return url;
  
  // Si ya es una de nuestras URLs internas, significa que ya está en la DB
  if (url.startsWith('/api/projects/')) return ''; 

  try {
    const fetchOptions = {
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    };
    if (config.planeApiKey) {
      fetchOptions.headers = { 'X-API-Key': config.planeApiKey };
    }

    const res = await fetch(url, fetchOptions);
    if (!res.ok) return '';
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error(`[SYNC_IMG_ERROR] Failed to fetch ${url}:`, err.message);
    return '';
  }
}

export async function syncProjectsFromPlane() {
  console.log('[PLANE_SYNC] Starting background synchronization...');
  const start = Date.now();

  try {
    // 1. Obtener proyectos de Plane DB (con timeout corto)
    const schema = String(config.planeProjectSchema || 'public');
    const projectsRes = await queryPlaneDb(`
      SELECT id, name, description, identifier, 
             cover_image, cover_image_asset_id,
             updated_at
      FROM ${schema}.projects
      LIMIT 500
    `);

    console.log(`[PLANE_SYNC] Found ${projectsRes.rows.length} projects in Plane.`);

    for (const p of projectsRes.rows) {
      const planeId = String(p.id);
      
      // 2. Verificar si necesitamos actualizar (por fecha o si faltan datos)
      const localRes = await appPool.query(
        'SELECT updated_at, logo, cover_photo FROM app_projects WHERE id = $1',
        [planeId]
      );
      
      const localProject = localRes.rows[0];
      const needsUpdate = !localProject || 
                         new Date(p.updated_at) > new Date(localProject.updated_at) ||
                         (!localProject.cover_photo && p.cover_image);

      if (needsUpdate) {
        console.log(`[PLANE_SYNC] Updating project ${p.identifier} (${p.name})...`);
        
        // Resolve URLs
        const coverUrl = resolveProjectCoverUrl(config, p);
        const absoluteCoverUrl = coverUrl.startsWith('/api/') 
          ? `${config.planeBaseUrl}/api/assets/v2/static/${coverUrl.split('/').pop()}/`
          : coverUrl;

        // Convert to Base64 (Esto solo ocurre una vez en el Sync, no en el Request del usuario)
        const coverBase64 = await ensureBase64(absoluteCoverUrl);

        await appPool.query(
          `INSERT INTO app_projects (id, user_id, name, description, code, accent_color, cover_photo, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             code = EXCLUDED.code,
             cover_photo = COALESCE(NULLIF(EXCLUDED.cover_photo, ''), app_projects.cover_photo),
             updated_at = EXCLUDED.updated_at`,
          [
            planeId,
            1, // Asumimos admin por defecto en el sync
            p.name,
            p.description || '',
            p.identifier || '',
            '#006399', // Color por defecto
            coverBase64,
            p.updated_at
          ]
        );
      }
    }

    console.log(`[PLANE_SYNC] Completed in ${Date.now() - start}ms`);
  } catch (error) {
    console.warn('[PLANE_SYNC_FAILED] Skipping sync due to connectivity issues:', error.message);
  }
}

// Iniciar el loop de sincronización
export function startPlaneSyncInterval(intervalMs = 300000) { // 5 minutos por defecto
  // Primera ejecución tras el arranque del servidor
  setTimeout(syncProjectsFromPlane, 5000);
  
  // Ejecución periódica
  setInterval(syncProjectsFromPlane, intervalMs);
}
