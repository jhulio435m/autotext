import { canUsePlaneApi } from '../../infrastructure/plane-client.js';
import { config } from '../../config.js';
import { fetchAssetAsBase64 } from '../../infrastructure/plane-client.js';
import {
  getProjectsFromPlaneDb,
  getLocalProjectById,
  upsertLocalProject
} from '../../infrastructure/project-repository.js';
import { listPlaneProjectsFlatFromApi } from '../../infrastructure/plane-api-provider.js';
import { resolveProjectCoverUrl } from '../../core/plane-mapper.js';

async function fetchProjectsFromActiveProvider() {
  if (canUsePlaneApi(config)) {
    console.log('[SYNC_FEATURE] Using Plane API provider...');
    return listPlaneProjectsFlatFromApi(config);
  }
  console.log('[SYNC_FEATURE] Using Plane DB provider...');
  const schema = config.planeProjectSchema || 'public';
  return getProjectsFromPlaneDb(schema);
}

export async function syncProjectsFromPlane() {
  console.log('[SYNC_FEATURE] Starting project synchronization...');
  const start = Date.now();

  try {
    const planeProjects = await fetchProjectsFromActiveProvider();

    console.log(`[SYNC_FEATURE] Found ${planeProjects.length} projects in Plane.`);

    for (const p of planeProjects) {
      const planeId = String(p.id);
      const localProject = await getLocalProjectById(planeId);

      const needsUpdate = !localProject ||
                         new Date(p.updated_at) > new Date(localProject.updated_at) ||
                         (!localProject.cover_photo && p.cover_image);

      if (needsUpdate) {
        console.log(`[SYNC_FEATURE] Updating project ${p.identifier} (${p.name})...`);

        const coverUrl = resolveProjectCoverUrl(config, p);

        const absoluteCoverUrl = coverUrl.startsWith('/api/')
          ? `${config.planeBaseUrl}/api/assets/v2/static/${coverUrl.split('/').pop()}/`
          : coverUrl;

        const coverBase64 = await fetchAssetAsBase64(absoluteCoverUrl, config);

        await upsertLocalProject({
          id: planeId,
          name: p.name,
          description: p.description || '',
          code: p.identifier || '',
          coverPhoto: coverBase64,
          updatedAt: p.updated_at
        });
      }
    }

    console.log(`[SYNC_FEATURE] Completed in ${Date.now() - start}ms`);
  } catch (error) {
    console.warn('[SYNC_FEATURE_FAILED] Synchronization skipped:', error.message);
  }
}

// Iniciar el loop de sincronización
export function startPlaneSyncInterval(intervalMs = 300000) { // 5 minutos por defecto
  // Primera ejecución tras el arranque del servidor
  setTimeout(syncProjectsFromPlane, 5000);
  
  // Ejecución periódica
  setInterval(syncProjectsFromPlane, intervalMs);
}

