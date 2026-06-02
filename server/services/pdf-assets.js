import fs from 'node:fs/promises';
import path from 'node:path';

export function toSafeAssetExtension(mimeType) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  return map[mimeType] || 'bin';
}

export async function writeDataUrlAsset(dataUrl, workdir, baseName) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) return '';
  const [, mimeType, payload] = match;
  const filename = `${baseName}.${toSafeAssetExtension(mimeType)}`;
  await fs.writeFile(path.join(workdir, filename), Buffer.from(payload, 'base64'));
  return filename;
}

export function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match?.[1] || 'bin';
  } catch {
    return 'bin';
  }
}

export function resolveAssetUrl(config, rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) {
    return `http://${config.apiHost}:${config.apiPort}${value}`;
  }
  return value;
}

export async function writeRemoteAsset(config, url, workdir, baseName) {
  const resolvedUrl = resolveAssetUrl(config, url);
  const response = await fetch(resolvedUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar asset remoto: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const extension = toSafeAssetExtension(contentType) || extensionFromUrl(url);
  const filename = `${baseName}.${extension === 'bin' ? extensionFromUrl(resolvedUrl) : extension}`;
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(path.join(workdir, filename), Buffer.from(arrayBuffer));
  return filename;
}

export async function materializePayloadAssets(config, payload, workdir) {
  const next = {
    ...payload,
    coverData: { ...(payload.coverData || {}) },
    formData: { ...(payload.formData || {}) }
  };

  if (/^data:image\//i.test(String(next.coverData.logo || ''))) {
    next.coverData.logo = await writeDataUrlAsset(next.coverData.logo, workdir, 'cover-logo');
  }

  if (/^data:image\//i.test(String(next.coverData.coverPhoto || ''))) {
    next.coverData.coverPhoto = await writeDataUrlAsset(next.coverData.coverPhoto, workdir, 'cover-photo');
  } else if (/^https?:\/\//i.test(String(next.coverData.coverPhoto || ''))) {
    try {
      next.coverData.coverPhoto = await writeRemoteAsset(config, next.coverData.coverPhoto, workdir, 'cover-photo');
    } catch {
      next.coverData.coverPhoto = '';
    }
  } else if (String(next.coverData.coverPhoto || '').startsWith('/')) {
    try {
      next.coverData.coverPhoto = await writeRemoteAsset(config, next.coverData.coverPhoto, workdir, 'cover-photo');
    } catch {
      next.coverData.coverPhoto = '';
    }
  }

  const walk = async (nodes) => {
    for (const node of nodes || []) {
      if (node?.isStructure) {
        await walk(node.children || []);
        continue;
      }

      if (node?.type !== 'image') continue;
      const value = next.formData?.[node.id];
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      if (/^data:image\//i.test(String(value.file || ''))) {
        next.formData[node.id] = {
          ...value,
          file: await writeDataUrlAsset(value.file, workdir, `node-${node.id}`)
        };
        continue;
      }
      if (/^https?:\/\//i.test(String(value.file || ''))) {
        try {
          next.formData[node.id] = {
            ...value,
            file: await writeRemoteAsset(config, value.file, workdir, `node-${node.id}`)
          };
        } catch {
          next.formData[node.id] = {
            ...value,
            file: ''
          };
        }
      } else if (String(value.file || '').startsWith('/')) {
        try {
          next.formData[node.id] = {
            ...value,
            file: await writeRemoteAsset(config, value.file, workdir, `node-${node.id}`)
          };
        } catch {
          next.formData[node.id] = {
            ...value,
            file: ''
          };
        }
      }
    }
  };

  await walk(next.structure);
  return next;
}
