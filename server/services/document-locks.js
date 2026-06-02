export function isLockExpired(lock) {
  if (!lock?.expires_at) return true;
  const expiresAt = new Date(lock.expires_at);
  return Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now();
}

export async function getDocumentLock(appPool, documentId) {
  const result = await appPool.query(
    `SELECT l.document_id, l.user_id, l.token, l.created_at, l.updated_at, l.expires_at,
            u.name AS user_name, u.email AS user_email
     FROM app_document_locks l
     JOIN app_users u ON u.id = l.user_id
     WHERE l.document_id = $1
     LIMIT 1`,
    [documentId]
  );
  return result.rows[0] || null;
}

export function normalizeLock(lock, currentUserId, token = '') {
  if (!lock || isLockExpired(lock)) {
    return {
      isLocked: false,
      ownedByCurrentUser: false
    };
  }

  const ownedByCurrentUser = Number(lock.user_id) === Number(currentUserId) && (!token || lock.token === token);

  return {
    isLocked: true,
    ownedByCurrentUser,
    documentId: lock.document_id,
    userId: Number(lock.user_id),
    userName: lock.user_name,
    userEmail: lock.user_email,
    expiresAt: lock.expires_at,
    updatedAt: lock.updated_at
  };
}

export async function purgeExpiredLock(appPool, documentId) {
  await appPool.query(
    'DELETE FROM app_document_locks WHERE document_id = $1 AND expires_at <= NOW()',
    [documentId]
  );
}

